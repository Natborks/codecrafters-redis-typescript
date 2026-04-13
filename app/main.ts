import * as net from "net";
import Parser from "./parser/Parser";
import Cache from "./Cache";

// You can use print statements as follows for debugging, they'll be visible when running tests.
console.log("Logs from your program will appear here!");

const cache = new Cache()
// Uncomment the code below to pass the first stage
const server: net.Server = net.createServer((connection: net.Socket) => {
  // Handle connection
  connection.on('data', (data: Buffer) => {
    const parser = new Parser(data.toString())
    const [command, ...args] = parser.getParsedString()
    if (!command) throw new Error("Command not found")
    
    switch (command.toUpperCase()){
      case "PING":
        connection.write("+PONG\r\n")
        break
      case "ECHO":
        connection.write(writeBulkString(args))
        break
      case "SET": {
        const [, key, ...values] = args;
        
        cache.set(key, values);
        connection.write("+OK\r\n")
        break
      }
      case "RPUSH": {
        const [, key, , val, ...options] = args;
        const count = cache.rpush(key, val, options);
        connection.write(`:${count}\r\n`)
        break
      }
      case "GET": {
        const [, query] = args;
        const result = cache.get(query);
        if (result) {
          connection.write(writeBulkString([result])) 
        } else {
          connection.write("$-1\r\n")
        }
        break
      }
    }
  })

});

function writeBulkString(args: any) : string {
   let response = "$"
    for (const literal of args) {
      if (Number.isInteger(parseInt(literal))) continue
      const length = literal.length
      response = response.concat(`${length}\r\n${literal}\r\n`)
    }

    return response
}

server.listen(6379, "127.0.0.1");
