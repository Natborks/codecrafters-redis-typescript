import {EventEmitter} from 'node:events'

export default class Cache extends EventEmitter{

  private cache: Map<string, any> = new Map();
  private requestQueue = []

  private ITEM_ADDED = 'item added'

  set(key: string, value: any, options: string[] = []) {
    this.cache.set(key, value);
    if (options.length > 0) {
      this.handleSetCacheOptions(key, options);
    }

    this.emit(this.ITEM_ADDED, key)
  }

  rpush(key: string, values: any[]): number {
    const existingValue = this.cache.get(key);

    const vals = []
    for (const val of values) {
      vals.push(val)
    }

    if (existingValue && Array.isArray(existingValue)) {
      existingValue.push(...vals);
      this.emit(this.ITEM_ADDED, key)
      return existingValue.length
    } 
    
    this.cache.set(key, vals);
    this.emit(this.ITEM_ADDED, key)
 
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
      this.emit(this.ITEM_ADDED, key)
      return existingValue.length
    }

    this.cache.set(key, vals)
    this.emit(this.ITEM_ADDED, key)

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

  blpop(key: string, timeout: number) : Promise<any[]> {
    const request = new Promise<any[]>((resolve, reject) => {
      if (this.cache.has(key)) {
        const result = this.lpop(key) as any[]
        return resolve([key, ...result])
      }

      this.on(this.ITEM_ADDED, (itemKey) => {
        return new Promise((resolve, reject) => {
          if (key === itemKey) {
            const result = this.lpop(key) as any[]
            return resolve([key, ...result])
          }
        })
      })
    })

    return request
  }

  llen(key: string) : number {
    const values = this.cache.get(key)

    if (!values) return 0

    return values.length
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