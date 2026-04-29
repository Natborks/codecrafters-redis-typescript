import type { ServerConfigDetails } from "../types/StoreTypes";
import * as net from "net";

export default class RepliactionConfig {
  static config: Map<number, ServerConfigDetails> = new Map();

 static getInfo(port: number): ServerConfigDetails | undefined {
    return this.config.get(port);
  }
  static storeServerDetails(configDetails: ServerConfigDetails) {
    this.config.set(configDetails.port, { ...configDetails });
  }

  //TODO: make this O(1)
  static getMasterConfig(): ServerConfigDetails {
    const config = [...this.config.values()].filter(config => config.replid)
    return config[0]
  }
}
