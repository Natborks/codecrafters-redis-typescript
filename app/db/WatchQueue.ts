import type { Event } from "../types/Service"

export default class WatchQueue {
    private watchQueue : Map<string, Event[]> = new Map()

    set(event: Event) {
        const {key} = event
        this.watchQueue.get(key)?.push(event)
    }

    get(key: string) {
        return this.watchQueue.get(key)
    }

    has(key: string) {
        return this.watchQueue.has(key)
    }

    items() {
        return Object.entries(this.watchQueue)
    }

    drain() {
        this.watchQueue = new Map()
    }

    isWatching() : boolean {
        return Object.keys(this.watchQueue).length > 0
    }
    
    startWatching(key: string) {
        this.watchQueue.set(key, [])
    }

    stopWatching(key: string) {
        this.watchQueue.delete(key)
    }
}

// export const watchQueue = new WatchQueue()
