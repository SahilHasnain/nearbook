import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const files = [
  "node_modules/react-native-appwrite/dist/esm/sdk.js",
  "node_modules/react-native-appwrite/dist/cjs/sdk.js",
];

for (const relativePath of files) {
  const path = resolve(root, relativePath);
  const source = readFileSync(path, "utf8");
  const patched = source.replaceAll("expo-file-system'", "expo-file-system/legacy'");

  if (patched === source && !source.includes("expo-file-system/legacy")) {
    throw new Error(`Could not patch ${relativePath}`);
  }

  if (patched !== source) writeFileSync(path, patched);
}
