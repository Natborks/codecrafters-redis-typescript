import * as net from "net";
import RepliactionConfig from "../db/ReplicationConfig";
import Parser from "../parser/Parser";
import type { ServerConfigDetails } from "../types/StoreTypes";
import ResponseUtils from "../utils/ResponseUtils";

export default class ReplicationService {
  private emptyRDB = "UkVESVMwMDEx+glyZWRpcy12ZXIFNy4yLjD6CnJlZGlzLWJpdHPAQPoFY3RpbWXCbQi8ZfoIdXNlZC1tZW3CsMQQAPoIYW9mLWJhc2XAAP/wbjv+wP9aog=="
  private connections: Array<net.Socket> = [] 
  private nonPropagatedCommands = new Set([
    "PING",
    "ECHO",
    "GET",
    "LRANGE",
    "LLEN",
    "LPOP",
    "BLPOP",
    "TYPE",
    "XREAD",
    "XRANGE",
    "INFO",
    "REPLCONF",
    "PSYNC",
    "MULTI",
    "EXEC",
    "DISCARD",
    "WATCH",
    "UNWATCH",
  ]);

  info(args: string[], port: number) {
    const config: ServerConfigDetails | undefined =
      RepliactionConfig.getInfo(port);
    if (!config) return ResponseUtils.writeSimpleError("No such service");

    if (config.isReplica) return ResponseUtils.writeBulkString(["role:slave"]);
    return ResponseUtils.writeBulkString([
      [
        "role:master",
        `master_replid:${config.replid}`,
        `master_repl_offset:${config.replOffset}`,
      ].join("\r\n"),
    ]);
  }

  createReplica(config: ServerConfigDetails) {
    RepliactionConfig.storeServerDetails(config);
  }

  ping(): string {
    return ResponseUtils.writeArrayString(["PING"]);
  }

  getEmptyRDB() : Buffer<ArrayBuffer> {
    return Buffer.from(this.emptyRDB, "base64")
  }
  psync(arg: string[]): string {
    const masterConfig = RepliactionConfig.getMasterConfig()
    if (masterConfig) {
      const replid = masterConfig.replid
      return ResponseUtils.writeSimpleString(`FULLRESYNC ${replid} 0`)
    }

   return ResponseUtils.writeSimpleString(`FULLRESYNC 0`) 
  }

  addConnection(connection: net.Socket) {
    this.connections.push(connection)
  }

  propagateCommand(data: Buffer, command: string) {
    if (this.nonPropagatedCommands.has(command)) return;

    for (const connection of this.connections) {
      connection.write(data)
    }
  }
}
