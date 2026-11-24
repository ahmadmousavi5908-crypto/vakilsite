import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  findIndexNowKey,
  prepareIndexNowKeyFile,
  resolveIndexNowKey,
} from "../../scripts/indexnow-key-config.mjs";

const key = "valid-indexnow-key-123";

async function withPublicDirectory(run) {
  const root = await mkdtemp(join(tmpdir(), "indexnow-key-"));
  const publicDirectory = join(root, "public");
  await mkdir(publicDirectory);
  try {
    await run(publicDirectory);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

test("discovers a key only when the filename and contents match", async () => {
  await withPublicDirectory(async (directory) => {
    await writeFile(join(directory, key + ".txt"), key + "\n");
    assert.equal(await findIndexNowKey(directory), key);
    assert.equal(await resolveIndexNowKey({ key: "", publicDirectory: directory }), key);
  });
});

test("prepares the protocol-compliant key filename", async () => {
  await withPublicDirectory(async (directory) => {
    const path = await prepareIndexNowKeyFile({ key, publicDirectory: directory });
    assert.equal(path, join(directory, key + ".txt"));
    assert.equal((await readFile(path, "utf8")).trim(), key);
  });
});

test("rejects a mismatched configured key", async () => {
  await withPublicDirectory(async (directory) => {
    await writeFile(join(directory, key + ".txt"), key);
    await assert.rejects(
      resolveIndexNowKey({ key: "different-indexnow-key-123", publicDirectory: directory }),
      /does not match/,
    );
  });
});

test("rejects mismatched file contents and multiple key files", async () => {
  await withPublicDirectory(async (directory) => {
    await writeFile(join(directory, key + ".txt"), "not-the-key");
    await assert.rejects(findIndexNowKey(directory), /contents must exactly match/);
  });
  await withPublicDirectory(async (directory) => {
    await writeFile(join(directory, key + ".txt"), key);
    await writeFile(join(directory, "another-indexnow-key-456.txt"), "another-indexnow-key-456");
    await assert.rejects(findIndexNowKey(directory), /Multiple IndexNow key files/);
  });
});
