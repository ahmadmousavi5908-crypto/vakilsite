import { resolve } from "node:path";
import { prepareIndexNowKeyFile, resolveIndexNowKey } from "./indexnow-key-config.mjs";

const publicDirectory = resolve(process.cwd(), "public");
const key = await resolveIndexNowKey({
  key: process.env.INDEXNOW_KEY,
  publicDirectory,
});

if (!key) {
  console.log("IndexNow key is not configured; key file generation skipped.");
  process.exit(0);
}

const filePath = await prepareIndexNowKeyFile({ key, publicDirectory });
console.log("IndexNow verification file prepared at /" + filePath.split(/[\\/]/).pop() + ".");
