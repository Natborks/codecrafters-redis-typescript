import {EventEmitter} from 'node:events'

export default class Cache extends EventEmitter{

  private cache: Map<string, any> = new Map();
  private requestQueue : Map<string, Array<() => void>> = new Map()

  private ITEM_ADDED = 'item added'

  constructor() {
    super();

    this.handleDataAddedEvent()
  }

  set(key: string, value: any, options: string[] = []) {
    this.cache.set(key, value);
    if (options.length > 0) {
      this.handleSetCacheOptions(key, options);
    }

  }

  rpush(key: string, values: any[]): number {
    const existingValue = this.cache.get(key);

    const vals = []
    for (const val of values) {
      vals.push(val)
    }

    if (existingValue && Array.isArray(existingValue)) {
      existingValue.push(...vals);
      this.emitItemsAdded(key, vals.length)
      return existingValue.length
    } 
    
    this.cache.set(key, vals);
    this.emitItemsAdded(key, vals.length)
 
    return vals.length;
  }

  lpush(key: string, values: any[]) : number {
    const existingValue = this.cache.get(key)

    const vals = []
    for (let i = 0; i < values.length; i += 1) {
      vals.unshift(values[i])
    }

    if (existingValue && Array.isArray(existingValue)) {
      existingValue.unshift(...vals)
      this.emitItemsAdded(key, vals.length)
      return existingValue.length
    }

    this.cache.set(key, vals)
    this.emitItemsAdded(key, vals.length)

    return vals.length
  }

  get(key: string): any {
    return this.cache.get(key);
  }

  lrange(key: string, rawStartIdx: number, rawEndIdx: number) : string[]{
    
    if (!this.cache.has(key)) return []
    const values = this.cache.get(key)
    
    let [startIdx, endIdx] = this.normalizeIndices(rawStartIdx, rawEndIdx, values)

    if (startIdx > endIdx) return []

    if (values.length == 0 || startIdx > values.length - 1) return []
    
    if (endIdx >= values.length) endIdx = values.length - 1

    const result: string[] = []
    for (let i = startIdx; i <= endIdx; i+=1) {
        result.push(values[i])
    }

    return result
  }

  lpop(key: string, count = 1) : any[] | null  {
    const values = this.cache.get(key)

    if (!values) return null

    if (count > values.length) return values

    const result = []
    for (let i = 0; i < count; i+= 1) {
      const elem = values.shift()
      result.push(elem)
    }

    return result
  }

  blpop(key: string, timeout: number) : Promise<string[]> {
    const value = this.lpop(key)
    timeout = timeout * 1000 // for milliseconds for timeout
    
    if (value && value.length > 0) {
      return Promise.resolve([key, ...value])
    }

    const commandTimeout = setTimeout(() => {
      Promise.resolve([key])
    }, timeout)

    return new Promise<string[]>(resolve => {
      const value = this.lpop(key)
      if (!value || value.length === 0) return false

      const command = () => {
        clearTimeout(commandTimeout)
        resolve([key, ...value])
        return 
      }

      const commands = this.requestQueue.get(key) ?? []
      commands.push(command)
      this.requestQueue.set(key, commands)
    })
  }

  llen(key: string) : number {
    const values = this.cache.get(key)

    if (!values) return 0

    return values.length
  }

  private handleDataAddedEvent() {
    this.on(this.ITEM_ADDED, itemKey => {
      if (this.requestQueue.has(itemKey)) {
        const commands = this.requestQueue.get(itemKey)!
        const nextCommand = commands.shift()!
        nextCommand()
      } 
    })
  }

  private emitItemsAdded(key: string, itemCount: number) {
    if (itemCount === 0) return

    setImmediate(() => {
      this.emit(this.ITEM_ADDED, key, itemCount)
    })
  }

  private handleSetCacheOptions(key: string, options: string[]) {
    const [, delay] = options;
    const interval = parseInt(delay);
    setTimeout(() => {
      this.cache.delete(key);
    }, interval);
  }

  private normalizeIndices(startIdx: number, endIdx: number, values: any[]) : number[] {
     startIdx = startIdx >= 0 ? startIdx : Math.max(0, startIdx + values.length)

     endIdx = endIdx >= 0 ? endIdx : Math.max(0, endIdx + values.length)

     return [startIdx, endIdx]
  }
}
