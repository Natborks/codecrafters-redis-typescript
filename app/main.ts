import * as net from "net";
import Parser from "./parser/Parser";

// You can use print statements as follows for debugging, they'll be visible when running tests.
console.log("Logs from your program will appear here!");

const cache = new Map<String, any>()
// Uncomment the code below to pass the first stage
const server: net.Server = net.createServer((connection: net.Socket) => {
  // Handle connection
  connection.on('data', (data: Buffer) => {
    const parser = new Parser(data.toString())
    const command = parser.getParsedString().shift()
    if (!command) throw new Error("Command not found")
    const args = parser.getParsedString()

    switch (command.toUpperCase()){
      case "PING":
        connection.write("+PONG\r\n")
        break
      case "ECHO":
        connection.write(writeBulkString(args))
        break
      case "SET":
        const [key, value] = args
        cache.set(key, value)
        connection.write("+OK\r\n")
        break
      case "GET":
        const query = args[0]
        const result = cache.get(query)
        console.log("query ", query, "result ", result)
        if (result) {
          connection.write(writeBulkString([...result])) 
        }
    }
  })

});

function writeBulkString(args: any) : string {
   let response = "$"
    for (const literal of args) {
      const length = literal.length
      response = response.concat(`${length}\r\n${literal}\r\n`)
    }

    return response
}

server.listen(6379, "127.0.0.1");
