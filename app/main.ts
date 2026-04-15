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
        const [key, val, ...options] = args;
        cache.set(key, val, options);
        connection.write("+OK\r\n")
        break
      }
      case "RPUSH": {
        const [key, ...values] = args;
        const count = cache.rpush(key, values);
        connection.write(`:${count}\r\n`)
        break
      }
      case "LPUSH": {
        const [key, ...values] = args
        const count = cache.lpush(key, values)
        connection.write(`:${count}\r\n`)
        break;
      }
      case "GET": {
        const [query] = args;
        const result = cache.get(query);
        if (result) {
          connection.write(writeBulkString([result])) 
        } else {
          connection.write("$-1\r\n")
        }
        break
      }
      case "LRANGE": {
        const [key, startIdx, endIdx] = args
        const values = cache.lrange(key, parseInt(startIdx), parseInt(endIdx))
        const bulkString = writeArrayString(values)
        connection.write(bulkString)
        break
      }
      case "LLEN": {
        const [key] = args
        const count = cache.llen(key)
        connection.write(`:${count}\r\n`)
        break 
      }
      case "LPOP": {
        const [key, numItems] = args
        const elem = cache.lpop(key, parseInt(numItems))
        if (elem) {
          const arrayString = writeArrayString(elem)
          console.log("Array String: ", arrayString)
          connection.write(arrayString)
        } else {
          connection.write("$-1\r\n") 
        }
      }
    }
  })
});

function writeBulkString(args: string[]) : string {
   let response = ""
    for (const literal of args) {
      const length = literal.length
      response = response.concat(`$${length}\r\n${literal}\r\n`)
    }

    return response
}

function writeArrayString(args: string[]) : string {
  console.log("ARGS: ", args)

  const response = writeBulkString(args)
  console.log("RESPONSE: ",response)
  return `*${args.length}\r\n${response}`
}

server.listen(6379, "127.0.0.1");
