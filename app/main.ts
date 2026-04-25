import * as net from "net";
import { argv } from "process";
import Parser from "./parser/Parser";
import Store from "./db/Store";
import StreamService from "./service/StreamService";
import StringService from "./service/StringService";

const store = new Store();
const streamService = new StreamService(store);

const parse = (data: string): string[] => {
  const parser = new Parser(data);
  return parser.getParsedString();
}

const unknownCommand = (command: string): string => {
  return `-ERR unknown command '${command}'\r\n`;
}
console.log(process.argv[0])
const PORT = parseInt(process.argv[2]) || 6397

const server: net.Server = net.createServer((connection: net.Socket) => {
  const stringService = new StringService(store);

  // Handle connection
  connection.on('data', async (data: Buffer) => {
    const [command, ...args] = parse(data.toString());
    if (!command) throw new Error("Command not found")

    switch (command.toUpperCase()){
      case "PING":
        connection.write(stringService.ping())
        break
      case "ECHO":
        connection.write(stringService.echo(args))
        break
      case "SET":
        connection.write(stringService.set(args))
        break
      case "RPUSH":
        connection.write(stringService.rpush(args))
        break
      case "LPUSH":
        connection.write(stringService.lpush(args))
        break
      case "GET":
        connection.write(stringService.get(args))
        break
      case "MULTI":
        connection.write(stringService.multi())
        break
      case "EXEC":
        connection.write(stringService.exec())
        break
      case "DISCARD":
        connection.write(stringService.discard())
        break
      case "INCR":
        connection.write(stringService.incr(args))
        break
      case "LRANGE":
        connection.write(stringService.lrange(args))
        break
      case "LLEN":
        connection.write(stringService.llen(args))
        break
      case "LPOP":
        connection.write(stringService.lpop(args))
        break
      case "BLPOP":
        connection.write(await stringService.blpop(args))
        break
      case "TYPE":
        connection.write(await stringService.getType(args))
        break
      case "WATCH":
        connection.write(stringService.watch(args))
        break
      case "UNWATCH":
        connection.write(stringService.unwatch(args))
        break
      case "XADD":
        connection.write(streamService.xadd(args))
        break
      case "XRANGE":
        connection.write(streamService.xrange(args))
        break
      case "XREAD":
        connection.write(await streamService.xread(args))
        break
      default:
        connection.write(unknownCommand(command))
        break
    }
  })
});

server.listen(PORT, "127.0.0.1");
