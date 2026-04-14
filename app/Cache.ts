export default class Cache {

  private cache: Map<string, any> = new Map();

  set(key: string, value: any, options: string[] = []) {
    this.cache.set(key, value);
    if (options.length > 0) {
      this.handleSetCacheOptions(key, options);
    }
  }

  rpush(key: string, values: any[], options: string[] = []): number {

    const existingValue = this.cache.get(key);

    const vals = []
    for (const val of values) {
        if (!Number.isInteger(parseInt(val))) {
            vals.push(val)
        }
    }

    if (existingValue && Array.isArray(existingValue)) {
      existingValue.push(...vals);
      return existingValue.length
    } 
    
    this.cache.set(key, vals);
 
    return vals.length;
  }

  get(key: string): any {
    return this.cache.get(key);
  }

  lrange(key: string, startIdx: number, endIdx: number) : string[]{
    if (startIdx > endIdx) return []

    const values = this.cache.get(key)
    
    if (!values || values.length == 0 || startIdx > values.length - 1) return []
    
    if (endIdx >= values.length) endIdx = values.length - 1

    const result: string[] = []
    for (let i = startIdx; i <= endIdx; i+=1) {
        result.push(values[i])
    }

    return result
  }

  private handleSetCacheOptions(key: string, options: string[]) {
    const [, , , delay] = options;
    const interval = parseInt(delay);
    setTimeout(() => {
      this.cache.delete(key);
    }, interval);
  }
}