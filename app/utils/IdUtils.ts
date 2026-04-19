export default class IdUtils {
    /**
     * Compare topId to newId. Each string consists of a two-part
     * idInMilliseconds-sequence number.
     *
     * A return value of 0 means both idMilliseconds and sequence number are 0.
     * -1 means the latestId (topId) in the stream is greater than the new record.
     *
     * @param topId The latest ID already in the stream.
     * @param newId The ID being validated for the new record.
     * @returns 0 when newId is 0-0, -1 when newId is not greater than topId, otherwise 1.
     */
    static validateId(topId: string, newId: string) : number{
        let [newMillisecondsPart, newSequencePart] = newId.split("-")
        let  [topMillisecondsPart, topSequencePart] = topId.split("-")

        const newMilliseconds = parseInt(newMillisecondsPart)
        const newSequence = parseInt(newSequencePart)
        const topMilliseconds = parseInt(topMillisecondsPart)
        const topSequence = parseInt(topSequencePart)

        if (newMilliseconds === 0 && newSequence === 0) return 0

        if (newMilliseconds < topMilliseconds) return -1

        if (newMilliseconds === topMilliseconds) {
            if (newSequence <= topSequence) {
                return -1
            }
        }

        return 1
        
    }

    static generateSequence(topId: string | null, newId: string): string {
        const [newMillisecondsPart] = newId.split("-")
        const newMilliseconds = parseInt(newMillisecondsPart)

        let sequence = newMilliseconds === 0 ? 1 : 0

        if (topId) {
            const [topMillisecondsPart, topSequencePart] = topId.split("-")
            const topMilliseconds = parseInt(topMillisecondsPart)
            const topSequence = parseInt(topSequencePart)

            if (newMilliseconds === topMilliseconds) {
                sequence = topSequence + 1
            }
        }

        return `${newMillisecondsPart}-${sequence}`
    }

    static autogenerateId(existingId: string | null, millisecondsPart: string): string {
        let sequence = 0

        if (existingId) {
            const [existingMillisecondsPart, sequencePart] = existingId.split("-")

            if (existingMillisecondsPart === millisecondsPart) {
                sequence = parseInt(sequencePart) + 1
            }
        }

        return `${millisecondsPart}-${sequence}`
    }
}
