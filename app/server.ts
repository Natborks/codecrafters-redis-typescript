import * as net from "net";
import Parser from "./parser/Parser";
import Store from "./db/Store";
import StreamService from "./service/StreamService";
import StringService from "./service/StringService";
import ReplicationService from "./service/ReplicationService";
import ResponseUtils from "./utils/ResponseUtils";
import { once } from "events";
import type { ServerConfigDetails } from "./types/StoreTypes";

//TODO clean this class up
const store = new Store();
const streamService = new StreamService(store);
const replicationService = new ReplicationService();
let defaultPort = 0;

const parse = (data: string): string[][] => {
  const parser = new Parser(data);
  return parser.getParsedString();
};

class Server {
  private server: net.Server;
  private masterConnection: net.Socket | null = null;

  constructor(private config: ServerConfigDetails) {
    this.server = net.createServer((connection: net.Socket) => {
      const stringService = new StringService(store);
      this.handleMessage(connection, stringService);
    });
  }

  async handleMessage(connection: net.Socket, stringService: StringService) {
    connection.on("data", async (data: Buffer) => {
      const commands = parse(data.toString());

      for (const fullCommand of commands) {
        const [command, ...args] = fullCommand;
        replicationService.propagateCommand(data, command);
        await this.handleCommand(connection, stringService, command, args);
      }
    });
  }

  establishConnectionWithMaster(master: string) {
    if (this.masterConnection) return;

    const [host, rawPort] = master.trim().split(" ");
    const masterConnection = net.connect(Number(rawPort), host);

    masterConnection.once("connect", async () => {
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
      masterConnection.write(
        ResponseUtils.writeArrayString(["PSYNC", "?", "-1"]),
      );
      await once(masterConnection, "data");
      await once(masterConnection, "data");

      masterConnection.on("data", async (data: Buffer) => {
        const stringService = new StringService(store);
        const commands = parse(data.toString());

        for (const fullCommand of commands) {
          const [command, ...args] = fullCommand;
          await this.handleCommand(undefined, stringService, command, args);
        }
      });
    });
  }

  handleCommand = async (
    connection: net.Socket | undefined,
    stringService: StringService,
    command: string,
    args: string[],
  ) => {
    switch (command.toUpperCase()) {
      case "PING":
        this.write(connection, stringService.ping());
        break;
      case "ECHO":
        this.write(connection, stringService.echo(args));
        break;
      case "SET":
        this.write(connection, stringService.set(args));
        break;
      case "RPUSH":
        this.write(connection, stringService.rpush(args));
        break;
      case "LPUSH":
        this.write(connection, stringService.lpush(args));
        break;
      case "GET":
        this.write(connection, stringService.get(args));
        break;
      case "MULTI":
        this.write(connection, stringService.multi());
        break;
      case "EXEC":
        this.write(connection, stringService.exec());
        break;
      case "DISCARD":
        this.write(connection, stringService.discard());
        break;
      case "INCR":
        this.write(connection, stringService.incr(args));
        break;
      case "LRANGE":
        this.write(connection, stringService.lrange(args));
        break;
      case "LLEN":
        this.write(connection, stringService.llen(args));
        break;
      case "LPOP":
        this.write(connection, stringService.lpop(args));
        break;
      case "BLPOP":
        this.write(connection, await stringService.blpop(args));
        break;
      case "TYPE":
        this.write(connection, await stringService.getType(args));
        break;
      case "WATCH":
        this.write(connection, stringService.watch(args));
        break;
      case "UNWATCH":
        this.write(connection, stringService.unwatch(args));
        break;
      case "XADD":
        this.write(connection, streamService.xadd(args));
        break;
      case "XRANGE":
        this.write(connection, streamService.xrange(args));
        break;
      case "XREAD":
        this.write(connection, await streamService.xread(args));
        break;
      case "INFO":
        this.write(connection, replicationService.info(defaultPort));
        break;
      case "REPLCONF":
        this.write(connection, ResponseUtils.writeSimpleString("OK"));
        break;
      case "PSYNC":
        this.write(connection, replicationService.psync(args));
        const emptyRDB = replicationService.getEmptyRDB();
        this.write(connection, `$${emptyRDB.length}\r\n`);
        this.write(
          connection,
          new Uint8Array(
            emptyRDB.buffer,
            emptyRDB.byteOffset,
            emptyRDB.byteLength,
          ),
        );
        if (connection) {
          replicationService.addConnection(connection);
        }
        break;
      default:
        this.write(
          connection,
          ResponseUtils.writeSimpleError("unknown command"),
        );
        break;
    }
  };

  write = (
    connection: net.Socket | undefined,
    response: string | Uint8Array,
  ) => {
    if (!connection) return;
    connection.write(response);
  };

  listen(port: number) {
    this.server.listen(port);
    if (this.config.isReplica) {
      this.establishConnectionWithMaster(this.config.master);
    }
  }
}

export function createServer(
  processId: string,
  port: number,
  isReplica = false,
  master: string,
  replid: string | undefined = undefined,
  replOffset: number | undefined = undefined,
): Server {
  replicationService.createReplica({
    port,
    id: processId,
    isReplica,
    master,
    replid,
    replOffset,
  });
  defaultPort = port;
  const server = new Server({
    port,
    id: processId,
    isReplica,
    master,
    replid,
    replOffset,
  });
  server.listen(port);

  return server;
}
