import { config } from "process";
import RepliactionConfig from "../db/ReplicationConfig";
import type { ServerConfigDetails } from "../types/StoreTypes";
import ResponseUtils from "../utils/ResponseUtils";

export default class ReplicationService {
  info(args: string[], port: number) {
    const config: ServerConfigDetails | undefined =
      RepliactionConfig.getInfo(port);
    if (!config) return ResponseUtils.writeSimpleError("No such service");

    if (config.isReplica) return ResponseUtils.writeBulkString(["role:slave"]);
    console.log(ResponseUtils.writeBulkString([
      "role:master",
      `master_replid:${config.replid}`,
      `master_repl_offset:"${config.replOffset}`,
    ]))
    return ResponseUtils.writeBulkString([
      "role:master",
      `master_replid:${config.replid}`,
      `master_repl_offset:${config.replOffset}`,
    ]);
  }

  createReplica(config: ServerConfigDetails) {
    RepliactionConfig.storeServerDetails(config);
  }
}
