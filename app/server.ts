import * as net from "net";
import Parser from "./parser/Parser";
import Store from "./db/Store";
import StreamService from "./service/StreamService";
import StringService from "./service/StringService";
import ReplicationService from "./service/ReplicationService";
import ResponseUtils from "./utils/ResponseUtils";
import { once } from "events";

//TODO clean this class up
const store = new Store();
const streamService = new StreamService(store);
const replicationService = new ReplicationService();
let defaultPort = 0;

const parse = (data: string): string[][] => {
  const parser = new Parser(data);
  return parser.getParsedCommands();
};

const write = (connection: net.Socket | undefined, response: string | Uint8Array) => {
  if (!connection) return;
  connection.write(response);
};

const establishConnection = (master: string) => {
  const [host, rawPort] = master.trim().split(" ");
  const masterConnection = net.connect(Number(rawPort), host);
  const stringService = new StringService(store);
  let pendingReplicationData = Buffer.alloc(0);
  let replicationState: "fullresync" | "rdb-length" | "rdb-data" | "commands" =
    "fullresync";
  let rdbBytesRemaining = 0;

  masterConnection.on("connect", async () => {
    masterConnection.write(ResponseUtils.writeArrayString(["PING"]));
    await once(masterConnection, "data");
    masterConnection.write(
      ResponseUtils.writeArrayString([
        "REPLCONF",
        "listening-port",
        defaultPort.toString(),
      ]),
    );
    await once(masterConnection, "data");
    masterConnection.write(
      ResponseUtils.writeArrayString(["REPLCONF", "capa", "psync2"]),
    );
    await once(masterConnection, "data");
    masterConnection.on("data", async (data: Buffer) => {
      pendingReplicationData = Buffer.concat([pendingReplicationData, data]);

      while (pendingReplicationData.length > 0) {
        if (replicationState === "fullresync") {
          const lineEnd = pendingReplicationData.indexOf("\r\n");
          if (lineEnd === -1) return;

          pendingReplicationData = pendingReplicationData.subarray(lineEnd + 2);
          replicationState = "rdb-length";
          continue;
        }

        if (replicationState === "rdb-length") {
          const lineEnd = pendingReplicationData.indexOf("\r\n");
          if (lineEnd === -1) return;

          const line = pendingReplicationData.subarray(0, lineEnd).toString();
          rdbBytesRemaining = Number.parseInt(line.slice(1), 10);
          pendingReplicationData = pendingReplicationData.subarray(lineEnd + 2);
          replicationState = "rdb-data";
          continue;
        }

        if (replicationState === "rdb-data") {
          if (pendingReplicationData.length < rdbBytesRemaining) {
            rdbBytesRemaining -= pendingReplicationData.length;
            pendingReplicationData = Buffer.alloc(0);
            return;
          }

          pendingReplicationData =
            pendingReplicationData.subarray(rdbBytesRemaining);
          rdbBytesRemaining = 0;
          replicationState = "commands";
          continue;
        }

        const parser = new Parser(pendingReplicationData.toString());
        const commands = parser.getParsedCommands();
        if (commands.length === 0) return;

        pendingReplicationData = Buffer.from(parser.getRemainder());
        for (const [command, ...args] of commands) {
          await handleCommand(undefined, stringService, command, args);
        }
      }
    });

    masterConnection.write(ResponseUtils.writeArrayString(["PSYNC", "?", "-1"]));
  });
};

const handleCommand = async (
  connection: net.Socket | undefined,
  stringService: StringService,
  command: string,
  args: string[],
) => {
  switch (command.toUpperCase()) {
    case "PING":
      write(connection, stringService.ping());
      break;
    case "ECHO":
      write(connection, stringService.echo(args));
      break;
    case "SET":
      write(connection, stringService.set(args));
      break;
    case "RPUSH":
      write(connection, stringService.rpush(args));
      break;
    case "LPUSH":
      write(connection, stringService.lpush(args));
      break;
    case "GET":
      write(connection, stringService.get(args));
      break;
    case "MULTI":
      write(connection, stringService.multi());
      break;
    case "EXEC":
      write(connection, stringService.exec());
      break;
    case "DISCARD":
      write(connection, stringService.discard());
      break;
    case "INCR":
      write(connection, stringService.incr(args));
      break;
    case "LRANGE":
      write(connection, stringService.lrange(args));
      break;
    case "LLEN":
      write(connection, stringService.llen(args));
      break;
    case "LPOP":
      write(connection, stringService.lpop(args));
      break;
    case "BLPOP":
      write(connection, await stringService.blpop(args));
      break;
    case "TYPE":
      write(connection, await stringService.getType(args));
      break;
    case "WATCH":
      write(connection, stringService.watch(args));
      break;
    case "UNWATCH":
      write(connection, stringService.unwatch(args));
      break;
    case "XADD":
      write(connection, streamService.xadd(args));
      break;
    case "XRANGE":
      write(connection, streamService.xrange(args));
      break;
    case "XREAD":
      write(connection, await streamService.xread(args));
      break;
    case "INFO":
      write(connection, replicationService.info(defaultPort));
      break;
    case "REPLCONF":
      write(connection, ResponseUtils.writeSimpleString("OK"));
      break;
    case "PSYNC":
      write(connection, replicationService.psync(args));
      const emptyRDB = replicationService.getEmptyRDB();
      write(connection, `$${emptyRDB.length}\r\n`);
      write(
        connection,
        new Uint8Array(emptyRDB.buffer, emptyRDB.byteOffset, emptyRDB.byteLength),
      );
      if (connection) {
        replicationService.addConnection(connection);
      }
      break;
    default:
      write(connection, ResponseUtils.writeSimpleError("unknown command"));
      break;
  }
};

const server: net.Server = net.createServer((connection: net.Socket) => {
  const stringService = new StringService(store);

  // Handle connection
  connection.on("data", async (data: Buffer) => {
    const commands = parse(data.toString());
    if (commands.length === 0) throw new Error("Command not found");

    for (const [command, ...args] of commands) {
      const payload = Buffer.from(
        ResponseUtils.writeArrayString([command, ...args]),
      );
      replicationService.propagateCommand(payload, command);
      await handleCommand(connection, stringService, command, args);
    }
  });
});



export function createServer(
  processId: string,
  port: number,
  isReplica = false,
  master: string,
  replid: string | undefined = undefined,
  replOffset: number | undefined = undefined,
): net.Server {
  replicationService.createReplica({
    port,
    id: processId,
    isReplica,
    master,
    replid,
    replOffset,
  });
  defaultPort = port;
  server.listen(port);
  console.log("running on port: ", port);

  if (isReplica) {
    establishConnection(master);
  }

  return server;
}
