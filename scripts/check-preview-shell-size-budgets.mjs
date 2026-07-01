import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");

const budgets = [
  { file: "scripts/preview/editor.js", maxLines: 320 },
  { file: "scripts/preview/layout-bridge.js", maxLines: 80 },
];

function countLines(source) {
  if (source.length === 0) return 0;
  const normalized = source.replace(/\r\n?/g, "\n");
  const lines = normalized.endsWith("\n")
    ? normalized.slice(0, -1).split("\n")
    : normalized.split("\n");
  // Track non-empty lines so the ratchet matches the repo's current 046 audit.
  return lines.filter((line) => line.trim() !== "").length;
}

const failures = [];
for (const budget of budgets) {
  const absolutePath = path.join(REPO_ROOT, budget.file);
  const source = fs.readFileSync(absolutePath, "utf8");
  const actualLines = countLines(source);
  if (actualLines > budget.maxLines) {
    failures.push(`${budget.file}: ${actualLines} lines > budget ${budget.maxLines}`);
  }
}

if (failures.length > 0) {
  console.error("Preview shell size budget exceeded:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Preview shell size budgets are within limits.");
