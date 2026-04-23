class WatchQueue {
    private watchQueue : string[] = []

    push(item: string) {
        this.watchQueue.push(item)
    }

    has(key: string) {
        return this.watchQueue.includes(key)
    }

    items() {
        return watchQueue
    }
}

export const watchQueue = new WatchQueue()