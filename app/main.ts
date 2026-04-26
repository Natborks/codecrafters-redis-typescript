import { argv } from "process";
import { createServer } from "./server";

const [, , ,port, isReplica, master] = argv;
createServer("1", Number(port || 6379), !!isReplica, master);

//   // Handle connection
//   connection.on('data', async (data: Buffer) => {
//     const [command, ...args] = parse(data.toString());
//     if (!command) throw new Error("Command not found")

//     switch (command.toUpperCase()){
//       case "PING":
//         connection.write(stringService.ping())
//         break
//       case "ECHO":
//         connection.write(stringService.echo(args))
//         break
//       case "SET":
//         connection.write(stringService.set(args))
//         break
//       case "RPUSH":
//         connection.write(stringService.rpush(args))
//         break
//       case "LPUSH":
//         connection.write(stringService.lpush(args))
//         break
//       case "GET":
//         connection.write(stringService.get(args))
//         break
//       case "MULTI":
//         connection.write(stringService.multi())
//         break
//       case "EXEC":
//         connection.write(stringService.exec())
//         break
//       case "DISCARD":
//         connection.write(stringService.discard())
//         break
//       case "INCR":
//         connection.write(stringService.incr(args))
//         break
//       case "LRANGE":
//         connection.write(stringService.lrange(args))
//         break
//       case "LLEN":
//         connection.write(stringService.llen(args))
//         break
//       case "LPOP":
//         connection.write(stringService.lpop(args))
//         break
//       case "BLPOP":
//         connection.write(await stringService.blpop(args))
//         break
//       case "TYPE":
//         connection.write(await stringService.getType(args))
//         break
//       case "WATCH":
//         connection.write(stringService.watch(args))
//         break
//       case "UNWATCH":
//         connection.write(stringService.unwatch(args))
//         break
//       case "XADD":
//         connection.write(streamService.xadd(args))
//         break
//       case "XRANGE":
//         connection.write(streamService.xrange(args))
//         break
//       case "XREAD":
//         connection.write(await streamService.xread(args))
//         break
//       case "INFO":
//         connection.write(replicationService.info(args))
//         break
//       default:
//         connection.write(unknownCommand(command))
//         break
//     }
//   })
// });

// server.listen(port, "127.0.0.1");
