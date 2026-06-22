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
  const context = {
    console,
    ...overrides,
  };
  (context as Record<string, any>)._getPreviewGridEditorCompat ??= () => {
    const interaction = typeof (context as Record<string, any>)._getEditorInteractionFacade === "function"
      ? (context as Record<string, any>)._getEditorInteractionFacade()
      : {};
    const textEdit = typeof (context as Record<string, any>)._getTextEditRuntime === "function"
      ? (context as Record<string, any>)._getTextEditRuntime()
      : {};
    return {
      ...interaction,
      ...textEdit,
    };
  };
  const source = `${extractNamedFunctionSource(loadEditorSource(), functionName, signature)}\nthis.__loaded = ${functionName};`;
  vm.runInNewContext(source, context);
  const loaded = (context as { __loaded?: T }).__loaded;
  if (!loaded) {
    throw new Error(`${functionName} was not loaded`);
  }
  return loaded;
}

function normalizeVmValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

test("commitTextEdit delegates text edit completion through the typed host helper", () => {
  const callbackActions: Array<string | Record<string, unknown>> = [];
  const clearedTimers: unknown[] = [];
  let delegatedState: Record<string, unknown> | null = null;
  const inspectorContract = {
    completePreviewTextEdit(options: Record<string, any>) {
      delegatedState = normalizeVmValue(options.state);
      options.setTextOverride("alpha", { heading: "After", label: ["keep"] });
      options.commitOverridePatchAction(
        "Edit text",
        options.captureOverrideEntries(["alpha"]),
        options.captureOverrideEntries(["alpha"]),
      );
      options.endInteraction();
      options.reapplySelection();
      options.scheduleRelayout("alpha");
    },
  };

  const context: Record<string, any> = {
      window: {
        LayoutEngine: {
          previewShell: {
            inspector: inspectorContract,
          },
        },
        __DG_getPreviewShellInspectorContract() {
          return this.LayoutEngine.previewShell.inspector;
        },
      },
      InteractionMode: {
        TEXT_EDITING: "text_editing",
      },
      mgr: {
        isMode(mode: string) {
          return mode === "text_editing";
        },
        state: {
          cid: "alpha",
          textEl: {
            style: {
              opacity: "0",
            },
          },
          editor: {
            role: "heading",
            originalValue: "Before",
            ta: {
              value: "After",
              remove() {},
            },
          },
        },
        endInteraction() {
          callbackActions.push("endInteraction");
        },
      },
      model: {
        overrides: {
          alpha: {
            text: {
              label: ["keep"],
            },
          },
        },
      },
      setOverride(cid: string, partial: unknown) {
        callbackActions.push({ setOverride: [cid, normalizeVmValue(partial)] });
      },
      EditorState: {
        captureOverrideEntries(ids: string[]) {
          return { ids };
        },
        commitOverridePatchAction(label: string, beforeEntries: unknown, afterEntries: unknown) {
          callbackActions.push({
            commitOverridePatchAction: {
              label,
              beforeEntries,
              afterEntries,
            },
          });
        },
      },
      reapplySelection() {
        callbackActions.push("reapplySelection");
      },
      clearTimeout(timer: unknown) {
        clearedTimers.push(timer);
      },
      _layoutRelayoutTimer: 41,
      _v3RelayoutTimer: 41,
      setTimeout(callback: () => void, delayMs: number) {
        callbackActions.push({ setTimeout: delayMs });
        callback();
        return 99;
      },
      requestLayoutRelayout(cid: string) {
        callbackActions.push({ requestV3Relayout: cid });
      },
      requestV3Relayout(cid: string) {
        callbackActions.push({ requestV3Relayout: cid });
      },
      LayoutEngine: {
        previewShell: {
          inspector: inspectorContract,
        },
      },
    };
  context._getTextEditRuntime = () => ({
    commitTextEdit() {
      delegatedState = normalizeVmValue(context.mgr.state);
      context.setOverride("alpha", { text: { heading: "After", label: ["keep"] } });
      context.EditorState.commitOverridePatchAction(
        "Edit text",
        context.EditorState.captureOverrideEntries(["alpha"]),
        context.EditorState.captureOverrideEntries(["alpha"]),
      );
      context.mgr.endInteraction();
      context.reapplySelection();
      context.clearTimeout(context._layoutRelayoutTimer);
      context._layoutRelayoutTimer = context.setTimeout(() => context.requestLayoutRelayout("alpha"), 100);
    },
  });

  const commitTextEdit = loadEditorFunction<() => void>(
    "commitTextEdit",
    "()",
    context,
  );

  commitTextEdit();

  assert.deepEqual(delegatedState, {
    cid: "alpha",
    textEl: {
      style: {
        opacity: "0",
      },
    },
    editor: {
      role: "heading",
      originalValue: "Before",
      ta: {
        value: "After",
      },
    },
  });
  assert.deepEqual(clearedTimers, [41]);
  assert.deepEqual(callbackActions, [
    { setOverride: ["alpha", { text: { heading: "After", label: ["keep"] } }] },
    {
      commitOverridePatchAction: {
        label: "Edit text",
        beforeEntries: { ids: ["alpha"] },
        afterEntries: { ids: ["alpha"] },
      },
    },
    "endInteraction",
    "reapplySelection",
    { setTimeout: 100 },
    { requestV3Relayout: "alpha" },
  ]);
});
