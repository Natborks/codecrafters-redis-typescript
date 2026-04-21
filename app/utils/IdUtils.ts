import StreamId from "../types/StreamId"

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
    static validateId(rawTopId: string, rawNewId: string) : number{
        const topId = new StreamId(rawTopId)
        const newId = new StreamId(rawNewId)

        return topId.compareTo(newId)
        // let [newMillisecondsPart, newSequencePart] = newId.split("-")
        // let  [topMillisecondsPart, topSequencePart] = topId.split("-")

        // const newMilliseconds = parseInt(newMillisecondsPart)
        // const newSequence = parseInt(newSequencePart)
        // const topMilliseconds = parseInt(topMillisecondsPart)
        // const topSequence = parseInt(topSequencePart)

        // if (newMilliseconds === 0 && newSequence === 0) return 0

        // if (newMilliseconds < topMilliseconds) return -1

        // if (newMilliseconds === topMilliseconds) {
        //     if (newSequence <= topSequence) {
        //         return -1
        //     }
        // }

        // return 1
        
    }

    /**
     * Generate the sequence number for an ID with an explicit millisecond part
     * and a wildcard sequence part.
     *
     * @param topId The latest ID already in the stream, or null for an empty stream.
     * @param newId The new ID with a wildcard sequence, such as 1526919030474-*.
     * @returns The new ID with the wildcard replaced by the generated sequence.
     */
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

    /**
     * Generate a full stream ID for XADD * using the current millisecond part.
     *
     * @param existingId An existing stream ID with the same millisecond part, or null.
     * @param millisecondsPart The Unix time in milliseconds to use as the ID time part.
     * @returns The generated stream ID with an incremented sequence when needed.
     */
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
