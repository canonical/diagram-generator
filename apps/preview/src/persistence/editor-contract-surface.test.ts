import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

function loadEditorSource(): string {
  const repoRoot = path.resolve(process.cwd(), "..", "..");
  return fs.readFileSync(path.join(repoRoot, "scripts", "preview", "editor.js"), "utf8");
}

test("editor shell no longer uses the flat LayoutEngine root contract directly", () => {
  const source = loadEditorSource();
  assert.equal(source.includes("LayoutEngine."), false);
});
