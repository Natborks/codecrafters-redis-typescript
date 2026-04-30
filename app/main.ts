import { argv } from "process";
import { createServer } from "./server";

const [, , , port, isReplica, master] = argv;
if (!!isReplica === false) {
  const replid = "8371b4fb1155b71f4a04d3e1bc3e18c4a990aeeb";
  const replOffset = 0;
  createServer(
    "1",
    Number(port || 6379),
    !!isReplica,
    master,
    replid,
    replOffset,
  );
} else {
  createServer("1", Number(port || 6379), !!isReplica, master);
}