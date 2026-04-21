import Store from "../Store";
import ResponseUtils from "../utils/ResponseUtils";

export default class StringService {
  private requestQueue : Map<string, Array<() => void>> = new Map()
  private ITEM_ADDED = 'item added'

  constructor(private store: Store) {
    this.registerQueueDrain()
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

  incr(args: string[]): string {
    const [key] = args;

    try {
      const value = this.store.incr(key)
      return ResponseUtils.writeInteger(value)
    } catch (error) {
      if (error instanceof Error) {
        return ResponseUtils.writeSimpleError(error.message)
      }

      return ResponseUtils.writeSimpleError("ERR value is not an integer or out of range")
    }
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

  private registerQueueDrain() {
    this.store.on(this.ITEM_ADDED, ([type, itemKey]) => {
      if (!this.requestQueue.has(itemKey)) return

      const commands = this.requestQueue.get(itemKey)
      const nextCommand = commands?.shift()

      if (!nextCommand) return

      nextCommand()
    })
  }
}
