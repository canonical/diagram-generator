import fs from "node:fs";
import path from "node:path";

export function repoRoot(): string {
  return path.resolve(process.cwd(), "..", "..");
}

export function readPreviewScript(fileName: string): string {
  return fs.readFileSync(path.join(repoRoot(), "scripts", "preview", fileName), "utf8");
}

export function extractNamedFunctionSource(source: string, functionName: string, signature: string): string {
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

export function normalizeVmValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function attachPreviewCompat<T extends Record<string, any>>(context: T): T {
  if (typeof context._getPreviewGridEditorCompat === "function") {
    return context;
  }
  context._getPreviewGridEditorCompat = () => {
    const bootstrap = typeof context._getEditorBootstrapFacade === "function"
      ? context._getEditorBootstrapFacade()
      : {};
    const scene = typeof context._getEditorSceneFacade === "function"
      ? context._getEditorSceneFacade()
      : {};
    const interaction = typeof context._getEditorInteractionFacade === "function"
      ? context._getEditorInteractionFacade()
      : {};
    const stageBinding = typeof context._getStageBindingRuntime === "function"
      ? context._getStageBindingRuntime()
      : interaction.getStageBindingRuntime?.() ?? {};
    const pointer = typeof context._getPointerInteractionRuntime === "function"
      ? context._getPointerInteractionRuntime()
      : interaction.getPointerInteractionRuntime?.() ?? {};
    const selectionChrome = typeof context._getSelectionChromeRuntime === "function"
      ? context._getSelectionChromeRuntime()
      : interaction.getSelectionChromeRuntime?.() ?? {};
    const selection = typeof context._getSelectionRuntime === "function"
      ? context._getSelectionRuntime()
      : interaction.getSelectionRuntime?.() ?? {};
    const inspectorDisplay = typeof context._getInspectorDisplayRuntime === "function"
      ? context._getInspectorDisplayRuntime()
      : interaction.getInspectorDisplayRuntime?.() ?? {};
    const inspectorMutation = typeof context._getInspectorMutationRuntime === "function"
      ? context._getInspectorMutationRuntime()
      : interaction.getInspectorMutationRuntime?.() ?? {};
    const inspectorSelection = typeof context._getInspectorSelectionRuntime === "function"
      ? context._getInspectorSelectionRuntime()
      : interaction.getInspectorSelectionRuntime?.() ?? {};
    const arrowWaypoint = typeof context._getArrowWaypointRuntime === "function"
      ? context._getArrowWaypointRuntime()
      : interaction.getArrowWaypointRuntime?.() ?? {};
    const textEdit = typeof context._getTextEditRuntime === "function"
      ? context._getTextEditRuntime()
      : interaction.getTextEditRuntime?.() ?? {};
    const resize = typeof context._getResizeInteractionRuntime === "function"
      ? context._getResizeInteractionRuntime()
      : interaction.getResizeInteractionRuntime?.() ?? {};
    const relayoutFacade = typeof context._getEditorRelayoutFacade === "function"
      ? context._getEditorRelayoutFacade()
      : {};
    const relayoutRuntime = typeof context._getRelayoutRuntime === "function"
      ? context._getRelayoutRuntime()
      : relayoutFacade.getRelayoutRuntime?.() ?? {};
    const keyboard = typeof context._getKeyboardRuntime === "function"
      ? context._getKeyboardRuntime()
      : interaction.getKeyboardRuntime?.() ?? {};
    return {
      ...bootstrap,
      ...scene,
      ...interaction,
      ...stageBinding,
      ...pointer,
      ...selectionChrome,
      ...selection,
      ...inspectorDisplay,
      ...inspectorMutation,
      ...inspectorSelection,
      ...arrowWaypoint,
      ...textEdit,
      ...resize,
      ...keyboard,
      buildTreeUi: stageBinding.buildTreeUi ?? interaction.buildTreeUi ?? context.buildTreeUI,
      bindInteraction: stageBinding.bindInteraction ?? interaction.bindInteraction ?? context.bindInteraction,
      onSvgDoubleClick: pointer.onSvgDoubleClick ?? interaction.onSvgDoubleClick ?? context.onSvgDblClick,
      onSvgMouseDown: pointer.onSvgMouseDown ?? interaction.onSvgMouseDown,
      onDragMove: pointer.onDragMove ?? interaction.onDragMove,
      showResizeHandles:
        selectionChrome.showResizeHandles ?? interaction.showResizeHandles ?? context.showResizeHandles,
      removeResizeHandles:
        selectionChrome.removeResizeHandles ?? interaction.removeResizeHandles ?? context.removeResizeHandles,
      startTextEdit: textEdit.startTextEdit ?? interaction.startTextEdit,
      getPrimarySelectedId: context.getPrimarySelectedId
        ?? ((preferredCid?: string | null) => (
          context.window?.__DG_getPreviewShellInteractionContract?.()
            ?.resolvePrimarySelectedId?.(context.selectedIds, preferredCid)
        )),
      requestLayoutRelayout: relayoutRuntime.requestRelayout ?? context.requestLayoutRelayout,
      clearOverride: relayoutRuntime.clearOverride ?? context.clearOverride,
      scheduleLayoutResizeRelayout:
        relayoutFacade.scheduleResizeRelayout ?? context._scheduleLayoutResizeRelayout,
      cancelLiveRelayout:
        relayoutFacade.cancelResizeRelayout ?? context._cancelLayoutResizeRelayout,
      persistResize: relayoutFacade.persistResize ?? context._persistResizeToLayout,
      getLayoutRelayoutStatus:
        relayoutFacade.getLayoutRelayoutStatus ?? context.getLayoutRelayoutStatus,
      finishRelayout: relayoutFacade.finishRelayout ?? context._finishLayoutRelayout,
      failRelayout: relayoutFacade.failRelayout ?? context._failLayoutRelayout,
      deleteSelectedFrames: scene.deleteSelectedFrames
        ? async (...args: unknown[]) => {
          const result = await scene.deleteSelectedFrames(...args);
          return result && typeof result === "object" && "rerendered" in result
            ? Boolean((result as { rerendered?: unknown }).rerendered)
            : result;
        }
        : context.deleteSelectedFrames,
      refreshGridInfoFromLayout:
        scene.refreshGridInfoFromLayout
        ?? context.refreshLayoutGridInfoFromLayout
        ?? context.refreshV3GridInfoFromLayout,
      rebuildArrowSvg: arrowWaypoint.rebuildArrowSvg ?? context.rebuildArrowSVG,
      loadSvg: bootstrap.loadSvg ?? context.loadSVG,
    };
  };
  return context;
}

export function createPreviewGridEditorRuntimeContext(options?: {
  bootstrapFacade?: unknown;
  interactionFacade?: unknown;
  relayoutFacade?: unknown;
  sceneFacade?: unknown;
}) {
  let capturedLegacyOptions: Record<string, unknown> | null = null;
  const runtime = {
    invalidateOverrideBoundFacades() {},
    getBootstrapFacade() {
      return options?.bootstrapFacade ?? { kind: "bootstrap-facade" };
    },
    getInteractionFacade() {
      return options?.interactionFacade ?? { kind: "interaction-facade" };
    },
    getRelayoutFacade() {
      return options?.relayoutFacade ?? { kind: "relayout-facade" };
    },
    getSceneFacade() {
      return options?.sceneFacade ?? { kind: "scene-facade" };
    },
  };

  const context = {
    console,
    SLUG: "demo",
    ACTIVE_LAYOUT_ENGINE: "v3",
    GRID: true,
    FALLBACK_GAP: 24,
    GUIDE_MODES: ["off", "all"],
    GUIDE_COLOR: "#f00",
    GUIDE_OPACITY: "0.5",
    BASELINE_STEP: 24,
    selectionDepth: 3,
    generation: 3,
    _allowInternalDirtyNavigation: false,
    lastViolations: [],
    overrides: { alpha: { width: 120 } },
    _coercedKeys: new Set(["coerced"]),
    selectedIds: new Set(["alpha", "beta"]),
    multiActionGap: 24,
    BOX_STYLES: { default: {} },
    INSET: 8,
    SHARED_HANDLE_SIZE: 12,
    SHARED_MIN_NODE_SIZE: 24,
    InteractionMode: {
      TEXT_EDITING: "text_editing",
      DRAGGING: "dragging",
      RESIZING: "resizing",
      WAYPOINT_DRAGGING: "waypoint_dragging",
    },
    model: {
      _roots: [{ data: { id: "alpha" }, id: "alpha", type: "box", gridRow: 1 }],
      roots: [{ id: "page-root" }],
      overrides: { alpha: { width: 120 } },
      gridOverrides: { cols: 8 },
      removedIds: new Set<string>(),
      setDiagramGrid() {},
      clearOverride() {},
      get() {
        return { data: { id: "alpha" } };
      },
    },
    mgr: {
      state: { cid: "alpha" },
      isMode() {
        return false;
      },
    },
    EditorState: {
      cloneValue<T>(value: T) {
        return value;
      },
      captureOverrideEntries() {
        return {};
      },
      commitOverridePatchAction() {},
      beginUndoableAction() {
        return {};
      },
      commitUndoableAction() {},
      runUndoableAction(_label: string, mutate: () => unknown) {
        return mutate();
      },
      clearUndoHistory() {},
      serializeDirtyState() {
        return "{}";
      },
      normalizeGridOverrides<T>(value: T) {
        return value;
      },
      undo() {
        return Promise.resolve();
      },
      redo() {
        return Promise.resolve();
      },
    },
    PreviewSaveClient: {
      isDirty() {
        return false;
      },
      trySaveIfDirty() {},
      syncSaveButton() {},
      syncDirtyFromSerialized() {},
      markSaved() {},
    },
    constraints: {
      validate() {
        return [];
      },
      summarise() {
        return { errors: 0 };
      },
    },
    replaceOverrides() {},
    _pruneLinkedRootGridOverrides() {},
    _clearPendingRestoreRuntime() {},
    _applyLocalRestoreRefresh() {},
    buildTreeUI() {},
    bindInteraction() {},
    deselectAll() {},
    reapplySelection() {},
    renderEmptyInspector() {},
    renderSelectionInspector() {},
    renderMultiSelectionInspector() {},
    selectComponent() {},
    _applySelectionStateSnapshot() {},
    getPrimarySelectedId() {
      return "alpha";
    },
    async deleteSelectedFrames() {
      return true;
    },
    getOwnDelta() {
      return { dx: 0, dy: 0, dw: 0, dh: 0 };
    },
    getEffectiveDelta() {
      return { dx: 0, dy: 0, dw: 0, dh: 0 };
    },
    getAncestors() {
      return ["root"];
    },
    getParentNode() {
      return { layout: "horizontal" };
    },
    getComponentNode() {
      return null;
    },
    getComponentType() {
      return "box";
    },
    getArrowNode() {
      return { waypoints: [] };
    },
    collectPeerSnapTargets() {
      return [];
    },
    collectGridSnapTargets() {
      return { xs: [24], ys: [48] };
    },
    snapRectToTargets() {
      return { dx: 0, dy: 0 };
    },
    clearGuideLines() {},
    renderGuideLines() {},
    clearHandlesByClass() {},
    renderResizeHandles() {},
    setOverride() {},
    _readRenderedStyleFields() {
      return { fill: "#fff" };
    },
    _applyInteractionOverrideEntries() {},
    cleanOverride() {},
    setWaypointOverride() {},
    setFrameProp() {},
    _scheduleLayoutResizeRelayout() {
      return false;
    },
    _scheduleV3ResizeRelayout() {
      return false;
    },
    _cancelLayoutResizeRelayout() {},
    _persistResizeToLayout() {},
    cycleGuideMode() {},
    requestLayoutRelayout() {
      return Promise.resolve(true);
    },
    requestV3Relayout() {
      return Promise.resolve(true);
    },
    snapToGrid(value: number) {
      return value;
    },
    _hasLayoutChildren() {
      return false;
    },
    _scheduleLayoutRelayout() {},
    renderBoxStyleOptions() {
      return "<option>default</option>";
    },
    _formatAsDefinedStyleLabel() {
      return "Defined";
    },
    _normaliseStyleName(value: string) {
      return value;
    },
    getInspectorElement() {
      return { id: "inspector", innerHTML: "" };
    },
    initNavTabs() {},
    setDirty() {},
    sanitizeSvgCloneForExport() {},
    getViolationsForComponent() {
      return [];
    },
    alert() {},
    requestAnimationFrame(callback: () => void) {
      callback();
      return 1;
    },
    cancelAnimationFrame() {},
    navigator: {
      clipboard: {
        writeText() {
          return Promise.resolve();
        },
      },
    },
    document: {
      getElementById() {
        return { id: "stage" };
      },
    },
    window: {
      __DG_CONFIG: {
        icon_size: 48,
        col_gap: 24,
        head_len: 10,
        head_half: 5,
      },
      getLayoutTextAdapter() {
        return { name: "adapter" };
      },
      __DG_getPreviewShellBootstrapContract() {
        return {
          createPreviewGridEditorInstallUnitFromLegacyEditorHost(
            nextOptions: Record<string, unknown>,
          ) {
            capturedLegacyOptions = nextOptions;
            return {
              getRuntime() {
                return runtime;
              },
              getBrowserState() {
                return { kind: "browser-state" };
              },
            };
          },
        };
      },
    },
  };

  return {
    context,
    runtime,
    getCapturedOptions() {
      return capturedLegacyOptions;
    },
  };
}

