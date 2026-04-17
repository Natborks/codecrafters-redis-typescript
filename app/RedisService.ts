import Cache from "./Cache";
import Parser from "./parser/Parser";

export default class RedisService {
  private cache = new Cache();

  async handle(data: Buffer): Promise<string> {
    const parser = new Parser(data.toString());
    const [command, ...args] = parser.getParsedString();

    if (!command) throw new Error("Command not found");

    switch (command.toUpperCase()) {
      case "PING":
        return "+PONG\r\n";
      case "ECHO":
        return this.writeBulkString(args);
      case "SET": {
        const [key, val, ...options] = args;
        this.cache.set(key, val, options);
        return "+OK\r\n";
      }
      case "RPUSH": {
        const [key, ...values] = args;
        const count = this.cache.rpush(key, values);
        return `:${count}\r\n`;
      }
      case "LPUSH": {
        const [key, ...values] = args;
        const count = this.cache.lpush(key, values);
        return `:${count}\r\n`;
      }
      case "GET": {
        const [query] = args;
        const result = this.cache.get(query);
        return result ? this.writeBulkString([result]) : "$-1\r\n";
      }
      case "LRANGE": {
        const [key, startIdx, endIdx] = args;
        const values = this.cache.lrange(key, parseInt(startIdx), parseInt(endIdx));
        return this.writeArrayString(values);
      }
      case "LLEN": {
        const [key] = args;
        const count = this.cache.llen(key);
        return `:${count}\r\n`;
      }
      case "LPOP": {
        const [key, numItems] = args;
        const count = numItems === undefined ? undefined : parseInt(numItems);
        const elems = this.cache.lpop(key, count);

        if (elems === null) {
          return "$-1\r\n";
        }

        return elems.length === 1
          ? this.writeBulkString(elems)
          : this.writeArrayString(elems);
      }
      case "BLPOP": {
        const [key, timeout] = args;
        const result = await this.cache.blpop(key, parseInt(timeout));
        return this.writeArrayString(result);
      }
      default:
        return `-ERR unknown command '${command}'\r\n`;
    }
  }

  private writeBulkString(args: string[]): string {
    let response = "";
    for (const literal of args) {
      const length = literal.length;
      response = response.concat(`$${length}\r\n${literal}\r\n`);
    }

    return response;
  }

  private writeArrayString(args: string[]): string {
    const response = this.writeBulkString(args);
    return `*${args.length}\r\n${response}`;
  }
}
