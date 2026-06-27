import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readPreviewScript } from "./preview-script-test-helpers.js";

test("component-model keeps a compatibility shim that delegates save payload assembly to the namespaced previewShell bootstrap contract", () => {
  const source = readPreviewScript("component-model.js");
  let delegatedModel: unknown = null;
  const expectedPayload = {
    overrides: { alpha: { dx: 8 } },
    format_version: 1,
  };
  const context = {
    window: {
      __DG_getPreviewShellBootstrapContract() {
        return {
          createPreviewOverridePayload(model: unknown) {
            delegatedModel = model;
            return expectedPayload;
          },
        };
      },
      LayoutEngine: {},
    },
    console,
  };

  vm.runInNewContext(source, context);

  const model = new (context.window as { ComponentModel: new () => { overrides: Record<string, unknown>; toOverridePayload: () => unknown } }).ComponentModel();
  model.overrides = { alpha: { dx: 8 } };

  assert.equal(delegatedModel, null);
  assert.deepEqual(model.toOverridePayload(), expectedPayload);
  assert.equal(delegatedModel, model);
});
