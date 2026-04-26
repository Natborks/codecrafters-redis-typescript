import ResponseUtils from "../utils/ResponseUtils";

export default class ReplicationService {
    info(args: string[]) {
        return ResponseUtils.writeBulkString(["role:master"])
    }
}