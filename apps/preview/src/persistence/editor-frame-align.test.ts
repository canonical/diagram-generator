import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

function loadEditorSource(): string {
  const repoRoot = path.resolve(process.cwd(), "..", "..");
  return fs.readFileSync(path.join(repoRoot, "scripts", "preview", "editor.js"), "utf8");
}

function extractNamedFunctionSource(source: string, functionName: string, signature: string): string {
  const functionMarkers = [
    `async function ${functionName}${signature} {`,
    `function ${functionName}${signature} {`,
  ];
  let functionStart = -1;
  for (const marker of functionMarkers) {
    functionStart = source.indexOf(marker);
    if (functionStart !== -1) {
      break;
    }
  }
  if (functionStart !== -1) {
    const bodyStart = source.indexOf("{", functionStart);
    if (bodyStart === -1) {
      throw new Error(`${functionName} body start not found`);
    }

    let depth = 0;
    let end = -1;
    for (let index = bodyStart; index < source.length; index += 1) {
      const char = source[index];
      if (char === "{") depth += 1;
      else if (char === "}") {
        depth -= 1;
        if (depth === 0) {
          end = index;
          break;
        }
      }
    }

    if (end === -1) {
      throw new Error(`${functionName} body end not found`);
    }

    return source.slice(functionStart, end + 1);
  }

  const arrowPrefixes = [
    `const ${functionName} = async ${signature} =>`,
    `const ${functionName} = ${signature} =>`,
    `let ${functionName} = async ${signature} =>`,
    `let ${functionName} = ${signature} =>`,
    `var ${functionName} = async ${signature} =>`,
    `var ${functionName} = ${signature} =>`,
  ];

  for (const prefix of arrowPrefixes) {
    const start = source.indexOf(prefix);
    if (start === -1) {
      continue;
    }

    let cursor = start + prefix.length;
    while (cursor < source.length && /\s/.test(source[cursor] ?? "")) {
      cursor += 1;
    }

    if (source[cursor] === "{") {
      let depth = 0;
      let end = -1;
      for (let index = cursor; index < source.length; index += 1) {
        const char = source[index];
        if (char === "{") depth += 1;
        else if (char === "}") {
          depth -= 1;
          if (depth === 0) {
            end = index;
            break;
          }
        }
      }

      if (end === -1) {
        throw new Error(`${functionName} body end not found`);
      }

      while (end + 1 < source.length && /\s/.test(source[end + 1] ?? "")) {
        end += 1;
      }
      if (source[end + 1] === ";") {
        end += 1;
      }
      return source.slice(start, end + 1);
    }

    const statementEnd = source.indexOf(";", cursor);
    if (statementEnd === -1) {
      throw new Error(`${functionName} statement end not found`);
    }
    return source.slice(start, statementEnd + 1);
  }

  const destructurePrefixes = [
    "const {",
    "let {",
    "var {",
  ];

  for (const prefix of destructurePrefixes) {
    let searchIndex = 0;
    while (true) {
      const start = source.indexOf(prefix, searchIndex);
      if (start === -1) {
        break;
      }

      const bodyStart = source.indexOf("{", start);
      if (bodyStart === -1) {
        break;
      }

      let depth = 0;
      let bodyEnd = -1;
      for (let index = bodyStart; index < source.length; index += 1) {
        const char = source[index];
        if (char === "{") depth += 1;
        else if (char === "}") {
          depth -= 1;
          if (depth === 0) {
            bodyEnd = index;
            break;
          }
        }
      }

      if (bodyEnd === -1) {
        throw new Error(`${functionName} destructured body end not found`);
      }

      const statementEnd = source.indexOf(";", bodyEnd);
      if (statementEnd === -1) {
        throw new Error(`${functionName} destructured statement end not found`);
      }

      const statement = source.slice(start, statementEnd + 1);
      const aliasPattern = new RegExp(
        String.raw`(?:^|[,{])\s*(?:[A-Za-z_$][\w$]*\s*:\s*)?${functionName}(?:\s*[=,}])`,
        "m",
      );
      const aliasMatch = statement.match(
        new RegExp(
          String.raw`(?:^|[,{])\s*(?:([A-Za-z_$][\w$]*)\s*:\s*)?${functionName}(?:\s*[=,}])`,
          "m",
        ),
      );
      if (aliasPattern.test(statement)) {
        const compatKey = aliasMatch?.[1] ?? functionName;
        return `const ${functionName} = _getPreviewGridEditorCompat().${compatKey};`;
      }

      searchIndex = statementEnd + 1;
    }
  }

  throw new Error(`${functionName} definition not found`);
}

function loadEditorFunction<T extends (...args: any[]) => unknown>(
  functionName: string,
  signature: string,
  overrides: Record<string, unknown>,
): T {
  const context: Record<string, any> = {
    console,
    ...overrides,
  };
  context.window ??= {};
  if (typeof context.window.__DG_getPreviewShellInspectorContract !== "function") {
    context.window.__DG_getPreviewShellInspectorContract = () => (
      context.LayoutEngine?.previewShell?.inspector
      ?? context.LayoutEngine
      ?? null
    );
  }
  if (typeof context._getPreviewGridEditorCompat !== "function") {
    context._getPreviewGridEditorCompat = () => ({
      ...(typeof context._getInspectorMutationRuntime === "function"
        ? context._getInspectorMutationRuntime()
        : {}),
      ...(typeof context._getInspectorSelectionRuntime === "function"
        ? context._getInspectorSelectionRuntime()
        : {}),
    });
  }
  const source = `${extractNamedFunctionSource(loadEditorSource(), functionName, signature)}\nthis.__loaded = ${functionName};`;
  vm.runInNewContext(source, context);
  const loaded = (context as { __loaded?: T }).__loaded;
  if (!loaded) {
    throw new Error(`${functionName} was not loaded`);
  }
  return loaded;
}

function createMutationTrap(label: string) {
  return new Proxy({}, {
    set() {
      throw new Error(`${label} should be mutated only inside the typed helper`);
    },
    defineProperty() {
      throw new Error(`${label} should be mutated only inside the typed helper`);
    },
  });
}

test("setFrameAlign delegates through the typed single-frame mutation helper", () => {
  let delegatedOptions: Record<string, unknown> | null = null;
  let relayoutCid: string | null = null;

  const setFrameAlign = loadEditorFunction<(cid: string, align: string) => void>(
    "setFrameAlign",
    "(cid, align)",
    {
      overrides: createMutationTrap("overrides"),
      _coercedKeys: new Set<string>(),
      snapToGrid(value: number) {
        return value;
      },
      model: {
        get() {
          return { data: { width: 120, height: 64 } };
        },
      },
      _getInspectorMutationRuntime() {
        return {
          setFrameAlign(cid: string, align: string) {
            delegatedOptions = { cid, align };
            relayoutCid = cid;
          },
        };
      },
      LayoutEngine: {
        dispatchPreviewSingleFrameAlignHost(options: Record<string, unknown>) {
          delegatedOptions = {
            cid: options.cid,
            align: options.align,
          };
          options.scheduleRelayout(options.cid);
          return { kind: "change" };
        },
      },
      EditorState: {
        captureOverrideEntries(ids: string[]) {
          return ids;
        },
        commitOverridePatchAction() {},
      },
      setDirty() {},
      renderSelectionInspector() {},
      requestV3Relayout(cid: string) {
        relayoutCid = cid;
      },
      clearTimeout() {},
      setTimeout(callback: () => void) {
        callback();
        return 1;
      },
      _v3RelayoutTimer: null,
    },
  );

  setFrameAlign("alpha", "CENTER_RIGHT");

  assert.deepEqual(delegatedOptions, {
    cid: "alpha",
    align: "CENTER_RIGHT",
  });
  assert.equal(relayoutCid, "alpha");
});

test("setMultiFrameAlign delegates through the typed multi-frame mutation helper", () => {
  let delegatedOptions: Record<string, unknown> | null = null;

  const setMultiFrameAlign = loadEditorFunction<(align: string) => void>(
    "setMultiFrameAlign",
    "(align)",
    {
      _getInspectorSelectionRuntime() {
        return {
          setMultiFrameAlign(align: string) {
            delegatedOptions = { align };
          },
        };
      },
      selectedIds: new Set(["alpha", "beta"]),
      overrides: createMutationTrap("overrides"),
      _coercedKeys: new Set<string>(),
      model: {
        get(cid: string) {
          return { id: cid, data: { width: 120, height: 64 } };
        },
      },
      EditorState: {
        captureOverrideEntries(ids: string[]) {
          return ids;
        },
        commitOverridePatchAction() {},
      },
      setDirty() {},
      renderMultiSelectionInspector() {},
      clearTimeout() {},
      setTimeout(callback: () => void) {
        callback();
        return 1;
      },
      _v3RelayoutTimer: null,
    },
  );

  setMultiFrameAlign("BOTTOM_CENTER");

  assert.deepEqual(delegatedOptions, {
    align: "BOTTOM_CENTER",
  });
});
