import Cache from "./Cache";
import Parser from "./parser/Parser";
import IdUtils from "./utils/IdUtils";

export default class RedisService {
  private cache = new Cache();

  parse(data: string): string[] {
    const parser = new Parser(data);
    return parser.getParsedString();
  }

  ping(): string {
    return this.writeSimpleString("PONG");
  }

  echo(args: string[]): string {
    return this.writeBulkString(args);
  }

  set(args: string[]): string {
    const [key, val, ...options] = args;
    this.cache.set(key, val, options);
    return this.writeSimpleString("OK");
  }

  rpush(args: string[]): string {
    const [key, ...values] = args;
    const count = this.cache.rpush(key, values);
    return `:${count}\r\n`;
  }

  lpush(args: string[]): string {
    const [key, ...values] = args;
    const count = this.cache.lpush(key, values);
    return `:${count}\r\n`;
  }

  get(args: string[]): string {
    const [query] = args;
    const result = this.cache.get(query);
    return result ? this.writeBulkString([result]) : "$-1\r\n";
  }

  lrange(args: string[]): string {
    const [key, startIdx, endIdx] = args;
    const values = this.cache.lrange(key, parseInt(startIdx), parseInt(endIdx));
    return this.writeArrayString(values);
  }

  llen(args: string[]): string {
    const [key] = args;
    const count = this.cache.llen(key);
    return `:${count}\r\n`;
  }

  lpop(args: string[]): string {
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

  async blpop(args: string[]): Promise<string> {
    try {
      const [key, timeout] = args;
      const result = await this.cache.blpop(key, parseFloat(timeout) * 1.0);
      return this.writeArrayString(result);
    } catch {
      return "*-1\r\n";
    }
  }

  async getType(args: string[]) {
    const [key] = args
    const type = this.cache.getType(key)

    return this.writeSimpleString(type)
    
  }

  xadd(args: string[]): string {
    const [key, rawEntryId, ...entries] = args;
    let entryId = rawEntryId
    const [, sequence] = entryId.split("-")
    const topItemId = this.cache.getTopItem(key)

    console.log("SEQUENCE", sequence)

    if (sequence === "*") {
      entryId = IdUtils.generateSequence(topItemId, entryId)
      console.log("ENTRY-ID", entryId)
    }

    if (topItemId) {
      const comp = IdUtils.validateId(topItemId, entryId)

      if (comp === 0) {
        return this.writeSimpleError(
          "ERR The ID specified in XADD must be greater than 0-0"
        )
      }

      if (comp === -1) {
        return this.writeSimpleError(
          "ERR The ID specified in XADD is equal or smaller than the target stream top item"
        )
      }
    }

    const result = this.cache.xadd(key, entryId, entries);
    return this.writeBulkString([result]);
  }

  unknownCommand(command: string): string {
    return `-ERR unknown command '${command}'\r\n`;
  }

  private writeSimpleString(value: string): string {
    return `+${value}\r\n`;
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

  private writeSimpleError(error: string): string {
    return `-${error}\r\n`
  }
}

console.log(IdUtils.validateId('1-2', '1-2'))
// const redisService = new RedisService();
// const [command, ...args] = redisService.parse("*3\r\n$5\r\nBLPOP\r\n$9\r\nraspberry\r\n$3\r\n0.1\r\n");
// const result = await redisService.blpop(args)

// const redisService = new RedisService();
// const [, ...args] = redisService.parse("*3\r\n$5\r\nBLPOP\r\n$8\r\npineapple\r\n$3\r\n3\r\n");
// const blpop = async () => await redisService.blpop(args)
// const response = blpop()
// const [, ...newargs] = redisService.parse("*3\r\n$5\r\nRPUSH\r\n$9\r\npineapple\r\n$4\r\npear\r\n")
// let result = redisService.lpush(newargs)
