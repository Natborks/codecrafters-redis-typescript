import Store from "./Store";
import Parser from "./parser/Parser";
import StreamId from "./types/StreamId";
import IdUtils from "./utils/IdUtils";
import ResponseUtils from "./utils/ResponseUtils";

export default class RedisService {
  private store = new Store();
  private requestQueue : Map<string, Array<() => void>> = new Map()
  private ITEM_ADDED = 'item added'

  constructor() {
    this.handleDataAddedEvent()
  }

  parse(data: string): string[] {
    const parser = new Parser(data);
    return parser.getParsedString();
  }

  ping(): string {
    return ResponseUtils.writeSimpleString("PONG");
  }

  echo(args: string[]): string {
    return ResponseUtils.writeBulkString(args);
  }

  set(args: string[]): string {
    const [key, val, ...options] = args;
    this.store.set(key, val, options);
    return ResponseUtils.writeSimpleString("OK");
  }

  rpush(args: string[]): string {
    const [key, ...values] = args;
    const count = this.store.rpush(key, values);
    return `:${count}\r\n`;
  }

  lpush(args: string[]): string {
    const [key, ...values] = args;
    const count = this.store.lpush(key, values);
    return `:${count}\r\n`;
  }

  get(args: string[]): string {
    const [query] = args;
    const result = this.store.get(query);
    return result ? ResponseUtils.writeBulkString([result]) : "$-1\r\n";
  }

  lrange(args: string[]): string {
    const [key, startIdx, endIdx] = args;
    const values = this.store.lrange(key, parseInt(startIdx), parseInt(endIdx));
    return ResponseUtils.writeArrayString(values);
  }

  llen(args: string[]): string {
    const [key] = args;
    const count = this.store.llen(key);
    return `:${count}\r\n`;
  }

  lpop(args: string[]): string {
    const [key, numItems] = args;
    const count = numItems === undefined ? undefined : parseInt(numItems);
    const elems = this.store.lpop(key, count);

    if (elems === null) {
      return "$-1\r\n";
    }

    return elems.length === 1
      ? ResponseUtils.writeBulkString(elems)
      : ResponseUtils.writeArrayString(elems);
  }

  async blpop(args: string[]): Promise<string> {
    try {
      const result = await this.getBlockingPopResult(args);
      return ResponseUtils.writeArrayString(result);
    } catch {
      return "*-1\r\n";
    }
  }

  async getType(args: string[]) {
    const [key] = args

    return ResponseUtils.writeSimpleString(this.store.getType(key))
    
  }

  //STREAM COMMANDS

  xadd(args: string[]): string {
    const [key, rawEntryId, ...entries] = args;
    let entryId = rawEntryId
    
    const topItemId = this.store.getTopItem(key)
    

    if (entryId === "*") {
      const millisecondsPart = Date.now().toString()
      const streamObj = this.store.hasStreamObj(key, millisecondsPart)
      entryId = IdUtils.autogenerateId(streamObj, millisecondsPart)
    } else {
      const [, sequence] = entryId.split("-")
      if (sequence === "*") entryId = IdUtils.generateSequence(topItemId, entryId)
    }

    if (topItemId) {
      const comp = IdUtils.validateId(topItemId, entryId)

      if (comp === 0) {
        return ResponseUtils.writeSimpleError(
          "ERR The ID specified in XADD must be greater than 0-0"
        )
      }

      if (comp === -1) {
        return ResponseUtils.writeSimpleError(
          "ERR The ID specified in XADD is equal or smaller than the target stream top item"
        )
      }
    }

    const result = this.store.xadd(key, entryId, entries);
    return ResponseUtils.writeBulkString([result]);
  }

  xrange(args: string[]): string {
    const [key, startId, endId] = args

    const result = this.store.xrange(key, startId, endId)

    return ResponseUtils.writeArrayString(result)
  }

  xread(args: string[]): string {
    const [, ...rest] = args

    let start = 0
    let end = rest.length - 1
    const result = []

    while (end > start) {
      console.log("REST", rest)
      const res = this.store.xread(rest[start], rest[end])
      console.log("REWS", res)
      result.push(res)
      start++
      end--
    }
    
    return ResponseUtils.writeArrayString([result])
  }

  unknownCommand(command: string): string {
    return `-ERR unknown command '${command}'\r\n`;
  }

  private getBlockingPopResult(args: string[]): Promise<string[]> {
    const [key, rawTimeout] = args;
    const value = this.store.lpop(key)
    const timeout = parseFloat(rawTimeout) * 1000 // for milliseconds for timeout

    if (value && value.length > 0) {
      return Promise.resolve([key, ...value])
    }

    return new Promise<string[]>((resolve, reject) => {
      const commandTimeout = setTimeout(() => {
        if (timeout === 0.0) {
          //wait indefinitely if timeout is 0
          setTimeout(() => {})
        } else {
          return reject([key])
        }
      }, timeout)

      const command = () => {
        const value = this.store.lpop(key) as []
        clearTimeout(commandTimeout)
        resolve([key, ...value])
        return
      }

      const commands = this.requestQueue.get(key) ?? []
      commands.push(command)
      this.requestQueue.set(key, commands)
    })
  }

  private handleDataAddedEvent() {
    this.store.on(this.ITEM_ADDED, itemKey => {
      if (this.requestQueue.has(itemKey)) {
        const commands = this.requestQueue.get(itemKey)!
        const nextCommand = commands.shift()!
        nextCommand()
      }
    })
  }
}
