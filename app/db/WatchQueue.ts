import type { Event } from "../types/ServiceTypes";

export default class WatchQueue {
  private watchQueue: Map<string, Event[]> = new Map();

  set(event: Event) {
    const events = this.watchQueue.get(event.key);
    if (!events) return;

    events.push(event);
  }

  get(key: string): Event[] {
    return this.watchQueue.get(key) ?? [];
  }

  has(key: string) {
    return this.watchQueue.has(key);
  }

  items() {
    return this.watchQueue.entries();
  }

  drain() {
    this.watchQueue.clear();
  }

  isWatching(): boolean {
    return this.watchQueue.size > 0;
  }

  startWatching(key: string) {
    if (!this.has(key)) {
      this.watchQueue.set(key, []);
    }
  }

  stopWatching(key: string) {
    console.log("REMOVING ", key);
    console.log(this.watchQueue.entries);
    this.watchQueue.delete(key);
  }
}
