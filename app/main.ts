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
    const [command, ...args] = parser.getParsedString()
    if (!command) throw new Error("Command not found")

    switch (command.toUpperCase()){
      case "PING":
        connection.write("+PONG\r\n")
        break
      case "ECHO":
        connection.write(writeBulkString(args))
        break
      case "SET":
        setCache(args)
        connection.write("+OK\r\n")
        break
      case "GET":
        const query = args[1]
        const result = cache.get(query)
        if (result) {
          connection.write(writeBulkString([result])) 
        } else {
          connection.write("$-1\r\n")
        }
    }
  })

});

function writeBulkString(args: any) : string {
  console.log(args)
   let response = "$"
    for (const literal of args) {
      const length = literal.length
      if (Number.isInteger(parseInt(literal))) {
        response = response.concat(`${length}\r\n${literal}\r\n`)
      }
    }

    return response
}

function setCache(args : string[]) {
  const [, key, , val, ...options] = args 
  cache.set(key, val) 
  if (options) handleSetCacheOptions(key, options)
}
function handleSetCacheOptions(key: string, options: string[]) {
  const [, , ,delay] = options
  const interval = parseInt(delay)
  setTimeout(() => {
    cache.delete(key)
  }, interval)

}

server.listen(6379, "127.0.0.1");
