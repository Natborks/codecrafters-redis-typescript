import * as net from "net";
import Scanner from "./scanner/Scanner";
import { TokenType } from "./types/TokenType";

// You can use print statements as follows for debugging, they'll be visible when running tests.
console.log("Logs from your program will appear here!");

// Uncomment the code below to pass the first stage
const server: net.Server = net.createServer((connection: net.Socket) => {
  // Handle connection
  connection.on('data', (data: Buffer) => {

    const scanner = new Scanner(data.toString("utf8"))

    let response = "$"
    for (const token of scanner.scanTokens()) {
      if (token.type === TokenType.STRING) {
        if (token.literal === "ECHO") continue

        const literal = token.literal
        const length = literal.length
        
        response = response.concat(`${length}\r\n${literal}\r\n`)
      }
    }
    connection.write(response)
  })

});

server.listen(6379, "127.0.0.1");
