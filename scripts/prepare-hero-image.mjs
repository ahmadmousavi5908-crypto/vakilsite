import { spawnSync } from "node:child_process";
import { stat } from "node:fs/promises";

const input = "public/images/lawyer.jpg";
const output = "public/images/lawyer.webp";

const source = await stat(input).catch(() => null);
if (!source?.isFile()) {
  throw new Error("The original lawyer hero image is missing.");
}

const result = spawnSync(
  "npx",
  [
    "--yes",
    "sharp-cli@6.1.0",
    "--input",
    input,
    "--output",
    output,
    "--format",
    "webp",
    "--quality",
    "84",
  ],
  { stdio: "inherit" },
);

if (result.error) throw result.error;
if (result.status !== 0) {
  throw new Error("Hero image WebP conversion failed.");
}

const optimized = await stat(output).catch(() => null);
if (!optimized?.isFile() || optimized.size === 0) {
  throw new Error("Hero image conversion did not produce a valid output file.");
}
if (optimized.size >= source.size) {
  throw new Error(
    `Optimized hero image (${optimized.size} bytes) is not smaller than source (${source.size} bytes).`,
  );
}

const reduction = ((1 - optimized.size / source.size) * 100).toFixed(1);
console.log(
  `Prepared hero WebP: ${source.size} -> ${optimized.size} bytes (${reduction}% smaller).`,
);
