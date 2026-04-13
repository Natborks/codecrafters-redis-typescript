export default class Cache {
  private cache: Map<string, any> = new Map();

  set(key: string, value: any, options: string[] = []) {
    this.cache.set(key, value);
    if (options.length > 0) {
      this.handleSetCacheOptions(key, options);
    }
  }

  rpush(key: string, value: any, options: string[] = []): number {
    console.log(options)
    const existingValue = this.cache.get(key);
    let count: number;
    if (existingValue && Array.isArray(existingValue)) {
      existingValue.push(value);
      count = existingValue.length;
    } else {
      this.cache.set(key, [value]);
      count = 1;
    }
    // if (options.length > 0) {
    //   this.handleSetCacheOptions(key, options);
    // }
    return count;
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