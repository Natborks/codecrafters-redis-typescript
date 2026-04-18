export default class IdUtils {
    static validateId(topId: string, newId: string) : number{
        console.log(topId, newId)
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