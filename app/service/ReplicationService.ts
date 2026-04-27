import RepliactionConfig from "../db/ReplicationConfig";
import type { ServerConfigDetails } from "../types/StoreTypes";
import ResponseUtils from "../utils/ResponseUtils";

export default class ReplicationService {
  info(args: string[], port: number) {
    const config: ServerConfigDetails | undefined =
      RepliactionConfig.getInfo(port);
    if (!config) return ResponseUtils.writeSimpleError("No such service");

    if (config.isReplica) return ResponseUtils.writeBulkString(["role:slave"]);
    return ResponseUtils.writeBulkString([[
      "role:master",
      `master_replid:${config.replid}`,
      `master_repl_offset:${config.replOffset}`,
    ].join("\r\n")]);
  }

  createReplica(config: ServerConfigDetails) {
    RepliactionConfig.storeServerDetails(config);
  }
   
  ping() : string{
    return ResponseUtils.writeArrayString(["PING"])
  }
}
