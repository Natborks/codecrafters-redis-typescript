class WatchQueue {
    private watchQueue : Set<string> = new Set()
    private watchMode = false 

    push(item: string) {
        if (!this.has(item)) this.watchQueue.add(item)
    }

    has(key: string) {
        return this.watchQueue.has(key)
    }

    items() {
        return watchQueue
    }

    drain() {
        this.watchQueue = new Set()
        this.stopWatching()
    }

    isWatching() : boolean {
        return this.watchMode === true
    }
    
    startWatching() {
        this.watchMode = true
    }

    stopWatching() {
        this.watchMode = false
    }
}

export const watchQueue = new WatchQueue()