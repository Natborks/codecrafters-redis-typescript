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
        let [id, newIdSeq] = newId.split("-")
        let  [tId, topIdSeq] = topId.split("-")

        const idmill = parseInt(id)
        const idSeq = parseInt(newIdSeq)
        const tidMill = parseInt(tId)
        const tidSeq = parseInt(topIdSeq)

        if (idmill === 0 && idSeq === 0) return 0

        if (idmill < tidMill) return -1

        if (idmill === tidMill) {
            if (idSeq <= tidSeq) {
                return -1
            }
        }

        return 1
        
    }
}
