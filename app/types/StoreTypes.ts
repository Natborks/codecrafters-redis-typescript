export type ServerConfigDetails = {
  port: number;
  id: string;
  isReplica: boolean;
  master: string;
  replid?: string;
  replOffset?: number;
};
