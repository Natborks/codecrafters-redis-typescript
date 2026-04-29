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

const parse = (data: string): string[] => {
  const parser = new Parser(data);
  return parser.getParsedString();
};

const establishConnection = (master: string) => {
  const [host, rawPort] = master.trim().split(" ");

  const masterConnection = net.connect(Number(rawPort), host);
  masterConnection.on("connect", async () => {
    masterConnection.write(ResponseUtils.writeArrayString(["PING"]));
    await once(masterConnection, "data")
    masterConnection.write(ResponseUtils.writeArrayString(["REPLCONF", "listening-port", defaultPort.toString()]));
    await once(masterConnection, "data")
    masterConnection.write(ResponseUtils.writeArrayString(["REPLCONF", "capa", "psync2"]));
    await once(masterConnection, "data")
    masterConnection.write(ResponseUtils.writeArrayString(["PSYNC", "?", "-1"]))
  });
};

const server: net.Server = net.createServer((connection: net.Socket) => {
  const stringService = new StringService(store);

  // Handle connection
  connection.on("data", async (data: Buffer) => {
    const [command, ...args] = parse(data.toString());
    replicationService.propagateCommand(data, command);

    switch (command.toUpperCase()) {
      case "PING":
        write(stringService.ping(), connection);
        break;
      case "ECHO":
        write(stringService.echo(args), connection);
        break;
      case "SET":
        write(stringService.set(args), connection);
        break;
      case "RPUSH":
        write(stringService.rpush(args), connection);
        break;
      case "LPUSH":
        write(stringService.lpush(args), connection);
        break;
      case "GET":
        write(stringService.get(args), connection);
        break;
      case "MULTI":
        write(stringService.multi(), connection);
        break;
      case "EXEC":
        write(stringService.exec(), connection);
        break;
      case "DISCARD":
        write(stringService.discard(), connection);
        break;
      case "INCR":
        write(stringService.incr(args), connection);
        break;
      case "LRANGE":
        write(stringService.lrange(args), connection);
        break;
      case "LLEN":
        write(stringService.llen(args), connection);
        break;
      case "LPOP":
        write(stringService.lpop(args), connection);
        break;
      case "BLPOP":
        write(await stringService.blpop(args), connection);
        break;
      case "TYPE":
        write(await stringService.getType(args), connection);
        break;
      case "WATCH":
        write(stringService.watch(args), connection);
        break;
      case "UNWATCH":
        write(stringService.unwatch(args), connection);
        break;
      case "XADD":
        write(streamService.xadd(args), connection);
        break;
      case "XRANGE":
        write(streamService.xrange(args), connection);
        break;
      case "XREAD":
        write(await streamService.xread(args), connection);
        break;
      case "INFO":
        write(replicationService.info(defaultPort), connection);
        break;
      case "REPLCONF":
        write(ResponseUtils.writeSimpleString("OK"), connection)
        break
      case "PSYNC":
        write(replicationService.psync(args), connection)
        const emptyRDB = replicationService.getEmptyRDB()
        write(`$${emptyRDB.length}\r\n`, connection);
        write(new Uint8Array(emptyRDB.buffer, emptyRDB.byteOffset, emptyRDB.byteLength), connection)
        replicationService.addConnection(connection)
        break 
      default:
        write(ResponseUtils.writeSimpleError("unknown command"), connection);
        break;
    }
  });
});

function write(response: string | Uint8Array, connection: net.Socket) {
  const info = replicationService.info(defaultPort)
  if (parse(info).includes("slave"))connection.write(response)
}

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
