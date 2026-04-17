import * as net from "net";
import RedisService from "./RedisService";

// You can use print statements as follows for debugging, they'll be visible when running tests.
console.log("Logs from your program will appear here!");

const redisService = new RedisService();
// Uncomment the code below to pass the first stage
const server: net.Server = net.createServer((connection: net.Socket) => {
  // Handle connection
  connection.on('data', async (data: Buffer) => {
    const response = await redisService.handle(data);
    connection.write(response);
  })
});

server.listen(6379, "127.0.0.1");
