import type { ServerConfigDetails } from "../types/StoreTypes";

export default class RepliactionConfig {
  static config: Map<number, ServerConfigDetails> = new Map();

  static getInfo(port: number): ServerConfigDetails | undefined {
    return this.config.get(port);
  }
  static storeServerDetails(configDetails: ServerConfigDetails) {
    this.config.set(configDetails.port, { ...configDetails });
  }

  static getMasterConfig(): ServerConfigDetails {
    const config = [...this.config.values()].filter(config => config.master)
    return config[0]
  }
}
