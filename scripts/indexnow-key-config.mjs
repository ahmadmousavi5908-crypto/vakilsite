import { readdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { isValidIndexNowKey } from "./indexnow-validation.mjs";

const KEY_FILE_PATTERN = /^([A-Za-z0-9-]{8,128})\.txt$/;

export async function findIndexNowKey(publicDirectory) {
  const directory = resolve(publicDirectory);
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }

  const candidates = entries
    .filter((entry) => entry.isFile() && KEY_FILE_PATTERN.test(entry.name))
    .map((entry) => ({ name: entry.name, key: entry.name.slice(0, -4) }));

  if (candidates.length > 1) {
    throw new Error("Multiple IndexNow key files exist in public/. Keep exactly one active key file.");
  }
  if (!candidates.length) return null;

  const candidate = candidates[0];
  if (!isValidIndexNowKey(candidate.key)) {
    throw new Error("The IndexNow key filename is invalid.");
  }
  const contents = (await readFile(resolve(directory, candidate.name), "utf8")).trim();
  if (contents !== candidate.key) {
    throw new Error("The IndexNow key file contents must exactly match its filename.");
  }
  return candidate.key;
}

export async function resolveIndexNowKey({ key, publicDirectory }) {
  const configuredKey = typeof key === "string" ? key.trim() : "";
  if (configuredKey && !isValidIndexNowKey(configuredKey)) {
    throw new Error("INDEXNOW_KEY must contain 8 to 128 letters, numbers, or hyphens.");
  }

  const fileKey = await findIndexNowKey(publicDirectory);
  if (configuredKey && fileKey && configuredKey !== fileKey) {
    throw new Error("INDEXNOW_KEY does not match the public IndexNow verification file.");
  }
  return configuredKey || fileKey;
}

export async function prepareIndexNowKeyFile({ key, publicDirectory }) {
  if (!isValidIndexNowKey(key)) {
    throw new Error("A valid IndexNow key is required to prepare its verification file.");
  }
  const directory = resolve(publicDirectory);
  const existingKey = await findIndexNowKey(directory);
  if (existingKey && existingKey !== key) {
    throw new Error("The existing IndexNow key file does not match the configured key.");
  }
  const filePath = resolve(directory, key + ".txt");
  await writeFile(filePath, key + "\n", "utf8");
  return filePath;
}
