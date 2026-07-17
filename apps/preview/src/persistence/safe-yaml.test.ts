import test from "node:test";
import assert from "node:assert/strict";

import { parsePreviewYaml } from "../safe-yaml.js";

test("preview YAML parsing never constructs or executes custom JavaScript tags", () => {
  const marker = "__dg_yaml_custom_tag_executed__";
  Reflect.deleteProperty(globalThis, marker);
  const malicious = [
    "payload: !!js/function >",
    `  function () { globalThis.${marker} = true; }`,
    "__proto__:",
    "  polluted: true",
    "",
  ].join("\n");

  let parsed: unknown = null;
  try {
    parsed = parsePreviewYaml(malicious);
  } catch {
    // Rejecting an unknown custom tag is also a safe result.
  }

  assert.equal(Reflect.get(globalThis, marker), undefined);
  assert.equal(Reflect.get(Object.prototype, "polluted"), undefined);
  if (parsed && typeof parsed === "object") {
    assert.notEqual(typeof Reflect.get(parsed, "payload"), "function");
  }
});
