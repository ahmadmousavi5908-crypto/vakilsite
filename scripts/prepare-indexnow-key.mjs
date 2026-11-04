import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { isValidIndexNowKey } from "./indexnow-validation.mjs";

async function loadLocalEnv() {
  try {
    const content = await readFile(resolve(process.cwd(), ".env.local"), "utf8");
    for (const line of content.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (!match || process.env[match[1]]) continue;
      process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, "$2");
    }
  } catch {
    // Environment variables may be supplied by the deployment platform.
  }
}

await loadLocalEnv();
const key = process.env.INDEXNOW_KEY?.trim();

if (!key) {
  console.log("IndexNow key is not configured; key file generation skipped.");
  process.exit(0);
}

if (!isValidIndexNowKey(key)) {
  console.error("INDEXNOW_KEY must contain 8 to 128 letters, numbers, or hyphens.");
  process.exit(1);
}

const publicDirectory = resolve(process.cwd(), "public");
await mkdir(publicDirectory, { recursive: true });
await writeFile(resolve(publicDirectory, "indexnow-key.txt"), key + "\n", "utf8");
console.log("IndexNow verification file prepared at /indexnow-key.txt.");
