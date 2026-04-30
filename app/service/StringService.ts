import Store from "../db/Store";
import WatchQueue from "../db/WatchQueue";
import type { Event } from "../types/ServiceTypes";
import ResponseUtils from "../utils/ResponseUtils";

export default class StringService {
  //All instances have to have the same queue
  static requestQueue: Map<string, Array<() => void>> = new Map();
  static isQueueDrainRegsitered = false;
  private ITEM_ADDED = "item added";
  private execModeQueue: Array<{ key: string; command: () => string }>;
  private execMode = false;
  private watchQueue = new WatchQueue();

  constructor(private store: Store) {
    this.registerQueueDrain();
    this.registerWatchEventHandler();
    this.execModeQueue = [];

    return new Proxy(this, {
      get(target, prop, receiver) {
        const method = Reflect.get(target, prop, receiver);

        if (
          typeof method !== "function" ||
          prop === "exec" ||
          prop === "multi" ||
          prop === "discard" ||
          prop === "watch" ||
          prop === "hasModifiedWatchedKeys" ||
          prop === "unwatch"
        ) {
          return method;
        }

        return (...args: unknown[]) => {
          const key = args[0] as string;

          if (!target.execMode) {
            return method.apply(target, args);
          }

          target.execModeQueue.push({
            key,
            command: () => method.apply(target, args),
          });
          return ResponseUtils.writeSimpleString("QUEUED");
        };
      },
    });
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
    return result
      ? ResponseUtils.writeBulkString([result])
      : ResponseUtils.writeNullBulkString();
  }

  multi(): string {
    this.execMode = true;
    return ResponseUtils.writeSimpleString("OK");
  }

  incr(args: string[]): string {
    const [key] = args;

    try {
      const value = this.store.incr(key);
      return ResponseUtils.writeInteger(value);
    } catch (error) {
      return ResponseUtils.writeSimpleError(
        "ERR value is not an integer or out of range",
      );
    }
  }

  exec(): string {
    if (!this.execMode) {
      return ResponseUtils.writeSimpleError("ERR EXEC without MULTI");
    }

    if (this.hasModifiedWatchedKeys()) {
      this.execMode = false;
      this.execModeQueue = [];
      this.watchQueue.drain();
      return ResponseUtils.writeNullArray();
    }

    const queuedCommands = this.execModeQueue;
    const responses: string[] = [];
    this.execModeQueue = [];
    this.execMode = false;
    this.watchQueue.drain();

    for (const { command } of queuedCommands) {
      responses.push(command());
    }

    const response = `*${responses.length}\r\n${responses.join("")}`;
    return response;
  }

  discard(): string {
    if (!this.execMode)
      return ResponseUtils.writeSimpleError("ERR DISCARD without MULTI");
    this.execModeQueue = [];
    this.execMode = false;
    this.watchQueue.drain();
    return ResponseUtils.writeSimpleString("OK");
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
      return ResponseUtils.writeNullBulkString();
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
    const [key] = args;

    return ResponseUtils.writeSimpleString(this.store.getType(key));
  }

  watch(args: string[]) {
    if (this.execMode)
      return ResponseUtils.writeSimpleError(
        "ERR WATCH inside MULTI is not allowed",
      );

    for (const key of args) {
      this.watchQueue.startWatching(key);
    }

    return ResponseUtils.writeSimpleString("OK");
  }

  unwatch(keys: string[]) {
    this.watchQueue.drain();
    return ResponseUtils.writeSimpleString("OK");
  }

  private getBlockingPopResult(args: string[]): Promise<string[]> {
    const [key, rawTimeout] = args;
    const value = this.store.lpop(key);
    const timeout = parseFloat(rawTimeout) * 1000; // for milliseconds for timeout

    if (value && value.length > 0) {
      return Promise.resolve([key, ...value]);
    }

    return new Promise<string[]>((resolve, reject) => {
      const commandTimeout = setTimeout(() => {
        if (timeout === 0.0) {
          //wait indefinitely if timeout is 0
          setTimeout(() => {});
        } else {
          return reject([key]);
        }
      }, timeout);

      const command = () => {
        const value = this.store.lpop(key) as [];
        clearTimeout(commandTimeout);
        resolve([key, ...value]);
        return;
      };

      const commands = StringService.requestQueue.get(key) ?? [];
      commands.push(command);
      StringService.requestQueue.set(key, commands);
    });
  }

  private registerQueueDrain() {
    if (StringService.isQueueDrainRegsitered) return;

    this.store.on(this.ITEM_ADDED, (event: Event) => {
      if (!StringService.requestQueue.has(event.key)) return;

      const commands = StringService.requestQueue.get(event.key);
      const nextCommand = commands?.shift();

      if (!nextCommand) return;

      return nextCommand();
    });
    StringService.isQueueDrainRegsitered = true;
  }

  private registerWatchEventHandler() {
    this.store.on(this.ITEM_ADDED, (event: Event) => {
      if (this.watchQueue.has(event.key)) this.watchQueue.set(event);
    });
  }

  private hasModifiedWatchedKeys(): boolean {
    for (const [, events] of this.watchQueue.items()) {
      if (events.length > 0) return true;
    }

    return false;
  }
}