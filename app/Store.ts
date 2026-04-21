import {EventEmitter} from 'node:events'
import StreamId from './types/StreamId';

export default class Store extends EventEmitter{
 
  private cache: Map<string, any> = new Map();
  //TODO: convert this to a sorted datatructure for easy querying
  private stream: Map<string, Array<{id: StreamId, values: string[]}>> = new Map();


  private ITEM_ADDED = 'item added'
  private STREAM_ITEM_ADDED = 'strea item added'

  constructor() {
    super();
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

  incr(key: string): number {
    const value = this.cache.get(key)

    if (Number.isNaN(value)) {
      throw new Error("ERR value is not an integer or out of range")
    }

    if (value === undefined) {
      this.cache.set(key, "1")
      return 1
    }

    const incrementedValue = Number(value) + 1

    this.cache.set(key, incrementedValue.toString())
    return incrementedValue
  }

  getType(key: string): string {
    const response = this.cache.has(key) ?
      "string" :
      this.stream.has(key) ? "stream" : "none"

    return response
  }

  getTopItem(key: string): string | null {
    const topItemList = this.stream.get(key)
    if(!topItemList) return null
    const topItem = topItemList[topItemList.length - 1]
    return topItem['id'].toString()
  }

  hasStreamObj(key: string, millisecondsPart: string): string | null {
    const streamQueue = this.stream.get(key)
    if (!streamQueue) return null

    for (let i = streamQueue.length - 1; i >= 0; i -= 1) {
      if(streamQueue[i].id.getId() === parseInt(millisecondsPart)) 
        return streamQueue[i].id.toString()
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

  llen(key: string) : number {
    const values = this.cache.get(key)

    if (!values) return 0

    return values.length
  }

  xadd(key: string, entryId: string, entries: string[]): string {
    const streamQueue = this.stream.get(key) ?? []
    streamQueue.push({id: new StreamId(entryId), values: entries})
    this.stream.set(key, streamQueue)
    this.emit(this.STREAM_ITEM_ADDED, ["streamKey", key])
    return entryId;
  }

  xrange(key: string, startId: string, endId: string): Array<{id: string, values: string[]}> {
    const streamArray = this.stream.get(key)
    if (!streamArray) return []

    startId = startId === "-" ? streamArray[0].id.toString() : startId
    endId = endId   === "+" ? streamArray[streamArray.length - 1].id.toString() : endId
    return streamArray.filter(({id: currentId}) => 
      currentId.gte(new StreamId(startId)) && 
      currentId.lte(new StreamId(endId))
    ).map(({id, values}) => {
      return {id: id.toString(), values}
    })
  }

  xread(key: string, startId: string): Array<{id: string, values: string[]}>{
    const streamArray = this.stream.get(key)
    if (!streamArray) return []
   
    
    if (startId === "$") {
      const lastItem = streamArray[streamArray.length - 1]
      return [{id: lastItem.id.toString(), values: lastItem.values}]
    }

    return streamArray
        .filter(({id}) => id.compareTo(new StreamId(startId)) === 1)
        .map(({id, values}) => { return {id: id.toString(), values} })
  }

  private handleSetCacheOptions(key: string, options: string[]) {
    const [, delay] = options;
    const interval = parseInt(delay);
    setTimeout(() => {
      this.cache.delete(key);
    }, interval);
  }

  private emitItemsAdded(key: string, itemCount: number) {
    if (itemCount === 0) return

    setImmediate(() => {
      this.emit(this.ITEM_ADDED, ["key", key])
    })
  }

  private normalizeIndices(startIdx: number, endIdx: number, values: any[]) : number[] {
     startIdx = startIdx >= 0 ? startIdx : Math.max(0, startIdx + values.length)

     endIdx = endIdx >= 0 ? endIdx : Math.max(0, endIdx + values.length)

     return [startIdx, endIdx]
  }
}
