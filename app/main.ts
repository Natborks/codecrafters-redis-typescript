import * as net from "net";
import RedisService from "./RedisService";

// You can use print statements as follows for debugging, they'll be visible when running tests.
console.log("Logs from your program will appear here!");

const redisService = new RedisService();
// Uncomment the code below to pass the first stage
const server: net.Server = net.createServer((connection: net.Socket) => {
  // Handle connection
  connection.on('data', async (data: Buffer) => {
    const [command, ...args] = redisService.parse(data);
    if (!command) throw new Error("Command not found")

    switch (command.toUpperCase()){
      case "PING":
        connection.write(redisService.ping())
        break
      case "ECHO":
        connection.write(redisService.echo(args))
        break
      case "SET":
        connection.write(redisService.set(args))
        break
      case "RPUSH":
        connection.write(redisService.rpush(args))
        break
      case "LPUSH":
        connection.write(redisService.lpush(args))
        break
      case "GET":
        connection.write(redisService.get(args))
        break
      case "LRANGE":
        connection.write(redisService.lrange(args))
        break
      case "LLEN":
        connection.write(redisService.llen(args))
        break
      case "LPOP":
        connection.write(redisService.lpop(args))
        break
      case "BLPOP":
        connection.write(await redisService.blpop(args))
        break
    }
  })
});

server.listen(6379, "127.0.0.1");
