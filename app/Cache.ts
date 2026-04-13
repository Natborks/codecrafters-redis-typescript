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
    console.log(values)

    const vals = []
    for (const val of values) {
        if (!Number.isInteger(parseInt(val))) {
            vals.push(val)
            console.log(val)
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

  private handleSetCacheOptions(key: string, options: string[]) {
    const [, , , delay] = options;
    const interval = parseInt(delay);
    setTimeout(() => {
      this.cache.delete(key);
    }, interval);
  }
}