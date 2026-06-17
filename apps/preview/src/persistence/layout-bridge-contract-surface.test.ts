import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

function loadLayoutBridgeSource(): string {
  const repoRoot = path.resolve(process.cwd(), "..", "..");
  return fs.readFileSync(path.join(repoRoot, "scripts", "preview", "layout-bridge.js"), "utf8");
}

function stripCommentsAndStrings(source: string): string {
  let result = "";
  let index = 0;

  while (index < source.length) {
    const char = source[index]!;
    const next = source[index + 1];

    if (char === "/" && next === "/") {
      index += 2;
      while (index < source.length && source[index] !== "\n") index += 1;
      continue;
    }
    if (char === "/" && next === "*") {
      index += 2;
      while (index + 1 < source.length && !(source[index] === "*" && source[index + 1] === "/")) {
        index += 1;
      }
      index += 2;
      continue;
    }
    if (char === "'" || char === '"' || char === "`") {
      const quote = char;
      result += quote + quote;
      index += 1;
      while (index < source.length) {
        const current = source[index]!;
        if (current === "\\") {
          index += 2;
          continue;
        }
        if (current === quote) {
          index += 1;
          break;
        }
        index += 1;
      }
      continue;
    }

    result += char;
    index += 1;
  }

  return result;
}

test("layout bridge no longer uses the flat LayoutEngine root contract directly in executable code", () => {
  const sanitizedSource = stripCommentsAndStrings(loadLayoutBridgeSource());
  assert.equal(/(^|[^.\w$])LayoutEngine\./m.test(sanitizedSource), false);
});
