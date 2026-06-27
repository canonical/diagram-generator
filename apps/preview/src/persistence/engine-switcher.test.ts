import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

function loadEngineSwitcherSource(): string {
  const repoRoot = path.resolve(process.cwd(), "..", "..");
  return fs.readFileSync(path.join(repoRoot, "scripts", "preview", "engine-switcher.js"), "utf8");
}

test("engine switcher delegates to the typed preview-shell bootstrap contract", () => {
  const initCalls: unknown[] = [];
  const document = {
    getElementById() {
      return null;
    },
  };
  const window = {
    __DG_getPreviewShellBootstrapContract() {
      return {
        initPreviewEngineWorkspaceChrome(args: unknown) {
          initCalls.push(args);
        },
      };
    },
  };
  const fetchFn = async () => ({ ok: true });

  vm.runInNewContext(loadEngineSwitcherSource(), {
    window,
    document,
    fetch: fetchFn,
    console,
  });

  assert.equal(initCalls.length, 1);
  const initCall = initCalls[0] as Record<string, unknown>;
  assert.equal(initCall.document, document);
  assert.equal(initCall.previewWindow, window);
  assert.equal(initCall.fetchFn, fetchFn);
});

test("engine switcher fails fast when the typed bootstrap contract is missing", () => {
  const document = {
    getElementById() {
      return null;
    },
  };
  const window = {
    __DG_getPreviewShellBootstrapContract() {
      return null;
    },
  };

  assert.throws(() => {
    vm.runInNewContext(loadEngineSwitcherSource(), {
      window,
      document,
      fetch: async () => ({ ok: true }),
      console,
    });
  }, /requires the previewShell bootstrap contract/);
});
