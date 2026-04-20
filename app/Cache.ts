import {EventEmitter} from 'node:events'

export default class Cache extends EventEmitter{

  private cache: Map<string, any> = new Map();
  //TODO: convert this to a sorted datatructure for easy querying
  private stream: Map<string, Array<{id: string, values: string[]}>> = new Map();


  private ITEM_ADDED = 'item added'

  constructor() {
    super();

    // this.handleDataAddedEvent()
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

  getType(key: string): string {
    const response = this.cache.has(key) ?
      "string" :
      this.stream.has(key) ? "stream" : "none"

    return response
  }

  getTopItem(key: string): any {
    const topItemList = this.stream.get(key)
    if(!topItemList) return null
    const topItem = topItemList[topItemList.length - 1]
    return topItem['id']
  }

  hasStreamObj(key: string, millisecondsPart: string): string | null {
    const streamQueue = this.stream.get(key)
    if (!streamQueue) return null

    for (let i = streamQueue.length - 1; i >= 0; i -= 1) {
      const {id} = streamQueue[i]
      const [streamMillisecondsPart] = id.split("-")

      if (streamMillisecondsPart === millisecondsPart) {
        return id
      }
    }

    return null
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

  // blpop(key: string, timeout: number) : Promise<string[]> {
  //   const value = this.lpop(key)
  //   timeout = timeout * 1000 // for milliseconds for timeout
  //   if (value && value.length > 0) {
  //     return Promise.resolve([key, ...value])
  //   }

  //   return new Promise<string[]>((resolve, reject) => {
  //     const commandTimeout = setTimeout(() => {
  //       if (timeout === 0.0) {
  //         //wait indefinitely if timeout is 0
  //         setTimeout(() => {})
  //       } else {
  //         return reject([key])
  //       }
  //     }, timeout)

  //     const command = () => {
  //       const value = this.lpop(key) as []
  //       clearTimeout(commandTimeout)
  //       resolve([key, ...value])
  //       return 
  //     }

  //     const commands = this.requestQueue.get(key) ?? []
  //     commands.push(command)
  //     this.requestQueue.set(key, commands)
  //   })
  // }

  llen(key: string) : number {
    const values = this.cache.get(key)

    if (!values) return 0

    return values.length
  }

  xadd(key: string, entryId: string, entries: string[]): string {
    const streamQueue = this.stream.get(key) ?? []
    streamQueue.push({id: entryId, values: entries})
    this.stream.set(key, streamQueue)
    return entryId;
  }

  private emitItemsAdded(key: string, itemCount: number) {
    if (itemCount === 0) return

    setImmediate(() => {
      this.emit(this.ITEM_ADDED, key, itemCount)
    })
  }

  xrange(key: string, startId: string, endId: string): Array<{id: string, values: string[]}> {
    const streamArray = this.stream.get(key)
    if (!streamArray) return []

    return streamArray.filter(({id: currentId}) => {
      const isAfterStart =  this.compareStreamIds(startId, currentId)
      const isBeforeEnd = this.compareStreamIds(currentId, endId)

      return isAfterStart && isBeforeEnd
    })
  }

  // private handleSetCacheOptions(key: string, options: string[]) {
  //   const [, delay] = options;
  //   const interval = parseInt(delay);
  //   setTimeout(() => {
  //     this.cache.delete(key);
  //   }, interval);
  // }

  private normalizeIndices(startIdx: number, endIdx: number, values: any[]) : number[] {
     startIdx = startIdx >= 0 ? startIdx : Math.max(0, startIdx + values.length)

     endIdx = endIdx >= 0 ? endIdx : Math.max(0, endIdx + values.length)

     return [startIdx, endIdx]
  }

  private compareStreamIds(leftId: string, rightId: string): boolean {
    const [leftMillisecondsPart, leftSequencePart] = leftId.split("-")
    const [rightMillisecondsPart, rightSequencePart] = rightId.split("-")

    const leftMilliseconds = parseInt(leftMillisecondsPart)
    const rightMilliseconds = parseInt(rightMillisecondsPart)

    if (leftMilliseconds - rightMilliseconds > 0) return false

    if (leftMilliseconds === rightMilliseconds)  {
      return rightSequencePart >= leftSequencePart
    }

    return false 
  }
}
