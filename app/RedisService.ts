import Store from "./Store";
import Parser from "./parser/Parser";
import IdUtils from "./utils/IdUtils";
import ResponseUtils from "./utils/ResponseUtils";

export default class RedisService {
  private store = new Store();
  private requestQueue : Map<string, Array<() => void>> = new Map()
  private streamRequestQueue : Map<string, Array<() => void>> = new Map()
  private ITEM_ADDED = 'item added'
  private STREAM_ITEM_ADDED = 'strea item added'

  constructor() {
    this.handleDataAddedEvent()
    this.handleStreamItemAdded()
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

  async xread(args: string[]): Promise<string> {
    try {
      const result = await this.handleXread(args)
      return ResponseUtils.writeArrayString(result)
    }catch {
      return "*-1\r\n";
    }


    // let key = 0
    // let id = rest.length / 2
    // const result = []

    // while (id < rest.length) {
    //   const streamKey = rest[key]
    //   const startId = rest[id]
    //   const res = this.store.xread(streamKey, startId)
    //   result.push([streamKey, res])
    //   key++
    //   id++
    // }
    
    // return ResponseUtils.writeArrayString(result)
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

  private handleXread(args: string[]) : Promise<any[]> {
    const getResponse = (args: string[]) => {
      let key = 0
      let id = args.length / 2
      const result = []

      while (id < args.length) {
        const streamKey = args[key]
        const startId = args[id]
        const res = this.store.xread(streamKey, startId)
        result.push([streamKey, res])
        key++
        id++
      }

      return result
    }

    console.log("ARGS: ", args)
    if (args[0] !== "block") {
      const [, ...rest] = args
      return Promise.resolve(getResponse(rest))
    }

    const [block, milliseconds, streams, ...rest] = args
    let delay = parseFloat(milliseconds)
    console.log("DELAY: ", delay)

    const data = getResponse(rest)

    if(data && data.length > 1) {
      return Promise.resolve(data)
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject("*-1\r\n")
      }, delay)

      const command = () => {
        const data = getResponse(rest)
        clearTimeout(timeout)
        return resolve(data)
      }

      const streamKey = rest[0]
      const stream = this.streamRequestQueue.get(streamKey) || []
      stream.push(command)
      this.streamRequestQueue.set(streamKey, stream)
    })
 
  }


  private handleDataAddedEvent() {
    this.store.on(this.ITEM_ADDED, ([type, itemKey]) => {
      if (this.requestQueue.has(itemKey)) {
        const commands = this.requestQueue.get(itemKey)!
        const nextCommand = commands.shift()!
        nextCommand()
      }
    })
  }

  private handleStreamItemAdded() {
    this.store.on(this.STREAM_ITEM_ADDED, ([type, itemKey]) => {
      if (this.streamRequestQueue.has(itemKey)) {
        const commands = this.streamRequestQueue.get(itemKey)
        const nextCommand = commands?.shift()!
        nextCommand()
      }
    })
  }
}
