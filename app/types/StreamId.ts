export default class StreamId {
    private id: number
    private sequence: number

    constructor(rawId: string) {
        const [id, sequence] = rawId.split("-")
        this.id = parseInt(id) 
        this.sequence = parseInt(sequence)
    }

    getId(): number {
        return this.id
    } 

    getSequence(): number {
        return this.sequence
    }

    compareTo(otherId: StreamId) : number {
        if (this.getId() < otherId.getId()) return -1

        if (this.getId() === otherId.getId()) {
            if (this.getSequence() < otherId.getSequence()) return -1
            if (this.getSequence() === otherId.getSequence())return 0
        }

        return 1
    }

    lte(otherId: StreamId) {
        return this.compareTo(otherId) === 0 || this.compareTo(otherId) === -1
    }

    gte(otherId: StreamId) {
        return this.compareTo(otherId) === 0 || this.compareTo(otherId) === 1
    }

    eq(otherId: StreamId) {
        return this.compareTo(otherId) === 0
    }

    toString() : string {
        return `${this.id}-${this.sequence}`
    }
}