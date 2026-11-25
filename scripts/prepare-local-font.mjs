import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const sourcePath = resolve("assets/fonts/Vazirmatn[wght].woff2.base64");
const targetPath = resolve("public/fonts/Vazirmatn[wght].woff2");
const encoded = (await readFile(sourcePath, "utf8")).replace(/\s+/g, "");

if (!/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) {
  throw new Error("The bundled Vazirmatn font payload is not valid base64.");
}

const font = Buffer.from(encoded, "base64");
if (font.subarray(0, 4).toString("ascii") !== "wOF2") {
  throw new Error("The bundled font is not a valid WOFF2 file.");
}

await mkdir(dirname(targetPath), { recursive: true });
await writeFile(targetPath, font);
console.log("Prepared local Vazirmatn font (" + font.length + " bytes).");
