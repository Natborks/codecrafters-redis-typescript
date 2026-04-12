import * as net from "net";
import Scanner from "./parser/Scanner";
import { TokenType } from "./types/TokenType";

// You can use print statements as follows for debugging, they'll be visible when running tests.
console.log("Logs from your program will appear here!");

const cache = new Map()

// Uncomment the code below to pass the first stage
const server: net.Server = net.createServer((connection: net.Socket) => {
  // Handle connection
  connection.on('data', (data: Buffer) => {
    const request = data.toString()

    const [command, args] = request.split(/\s+/)
    console.log(args)

    if (command === 'PING') {
      return connection.write("+PONG\r\n")
    }

    if (data.toString().includes("GET")) {
      
    }


    let response = "$"
    for (const token of [...args]) {
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
