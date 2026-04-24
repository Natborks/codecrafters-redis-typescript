import Store from "../db/Store";
import { watchQueue } from "../db/WatchQueue";
import type { Event } from "../types/Service";
import ResponseUtils from "../utils/ResponseUtils";

export default class StringService {
  //All instances have to have the same queue
  static requestQueue : Map<string, Array<() => void>> = new Map()
  static isQueueDrainRegsitered = false
  private ITEM_ADDED = 'item added'
  private execQueue: Array<{key: string, command: () => string}>
  private execMode = false

  constructor(private store: Store) {
    this.registerQueueDrain()
    this.execQueue = []

    return new Proxy(this, {
      get(target, prop, receiver) {
        const method = Reflect.get(target, prop, receiver)

        if (typeof method !== "function" 
          || prop === "exec" 
          || prop === "multi" 
          || prop === "discard"
          || prop === "watch"
        ) {
          return method
        }

        return (...args: unknown[]) => {
          const key = args[0] as string

          if (!target.execMode) {
            return method.apply(target, args)
          }

          target.execQueue.push({key, command: () => method.apply(target, args)})
          return ResponseUtils.writeSimpleString("QUEUED")
        }
      },
    })
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
    return result ? ResponseUtils.writeBulkString([result]) : ResponseUtils.writeNullArray();
  }

  multi(): string {
    this.execMode = true
    return ResponseUtils.writeSimpleString("OK");
  }

  incr(args: string[]): string {
    const [key] = args;

    try {
      const value = this.store.incr(key)
      return ResponseUtils.writeInteger(value)
    } catch (error) {
      return ResponseUtils.writeSimpleError("ERR value is not an integer or out of range")
    }
  }
   
  exec(): string {
    if (!this.execMode) {
      return ResponseUtils.writeSimpleError("ERR EXEC without MULTI")
    }

    //check 
    const responses: string[] = []
    for (const {key, command} of this.execQueue) {
      const events = watchQueue.get(key)
      if (events && events.length > 1) {
        this.execMode = false
        this.execQueue = []
        watchQueue.drain()
        return ResponseUtils.writeNullArray()
      }
      responses.push(command())
    }

    const response = `*${responses.length}\r\n${responses.join("")}`
    this.execQueue = []
    this.execMode = false
    watchQueue.drain()
    return response
  }

  discard(): string {
    if (!this.execMode) return ResponseUtils.writeSimpleError("ERR DISCARD without MULTI")
    this.execQueue = []
    this.execMode = false
    return ResponseUtils.writeSimpleString("OK")
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
      return ResponseUtils.writeNullArray();
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

  watch(args: string[]) {
    if (this.execMode) return ResponseUtils.writeSimpleError("ERR WATCH inside MULTI is not allowed")
   
    watchQueue.startWatching(args[0])
    return ResponseUtils.writeSimpleString("OK")
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
        console.log("BLPOP RESULT", value)
        clearTimeout(commandTimeout)
        resolve([key, ...value])
        return
      }

      const commands = StringService.requestQueue.get(key) ?? []
      commands.push(command)
      StringService.requestQueue.set(key, commands)
    })
  }

  private registerQueueDrain() {
    if (StringService.isQueueDrainRegsitered) return

    this.store.on(this.ITEM_ADDED, (event: Event) => {
      if (watchQueue.has(event.key)) watchQueue.set(event)

      if (!StringService.requestQueue.has(event.key)) return

      const commands = StringService.requestQueue.get(event.key)
      const nextCommand = commands?.shift()

      if (!nextCommand) return

      return nextCommand()
    })
    StringService.isQueueDrainRegsitered = true
  }

}
