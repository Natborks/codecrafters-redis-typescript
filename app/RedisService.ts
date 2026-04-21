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
    this.registerQueueDrain(this.ITEM_ADDED, this.requestQueue)
    this.registerQueueDrain(this.STREAM_ITEM_ADDED, this.streamRequestQueue)
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
    const timeout = parseFloat(rawTimeout) * 1000 // for milliseconds for timeout

    return this.waitForResult({
      queueKey: key,
      queueMap: this.requestQueue,
      timeout,
      getResult: () => {
        const value = this.store.lpop(key)
        return value ? [key, ...value] : []
      },
      hasResult: (value) => value.length > 0,
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

    if (args[0] !== "block") {
      const [, ...rest] = args
      return Promise.resolve(getResponse(rest))
    }

    const [block, milliseconds, streams, ...rest] = args
    let delay = parseFloat(milliseconds)

    return this.waitForResult({
      queueKey: rest[0],
      queueMap: this.streamRequestQueue,
      timeout: delay,
      getResult: () => getResponse(rest),
      hasResult: (data) => data.length > 1,
    })
 
  }

  private waitForResult<T>({
    queueKey,
    queueMap,
    timeout,
    getResult,
    hasResult,
  }: {
    queueKey: string,
    queueMap: Map<string, Array<() => void>>,
    timeout: number,
    getResult: () => T,
    hasResult: (result: T) => boolean,
  }): Promise<T> {
    const result = getResult()

    if (hasResult(result)) {
      return Promise.resolve(result)
    }

    return new Promise<T>((resolve, reject) => {
      const commandTimeout = timeout === 0
        ? undefined
        : setTimeout(() => reject(), timeout)

      const command = () => {
        const nextResult = getResult()

        if (!hasResult(nextResult)) return

        if (commandTimeout) {
          clearTimeout(commandTimeout)
        }

        resolve(nextResult)
      }

      const commands = queueMap.get(queueKey) ?? []
      commands.push(command)
      queueMap.set(queueKey, commands)
    })
  }

  private registerQueueDrain(
    eventName: string,
    queueMap: Map<string, Array<() => void>>,
  ) {
    this.store.on(eventName, ([type, itemKey]) => {
      if (!queueMap.has(itemKey)) return

      const commands = queueMap.get(itemKey)
      const nextCommand = commands?.shift()

      if (!nextCommand) return

      nextCommand()
    })
  }
}
