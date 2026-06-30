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

  const assignmentPrefixes = [
    `const ${functionName} =`,
    `let ${functionName} =`,
    `var ${functionName} =`,
  ];
  for (const prefix of assignmentPrefixes) {
    const start = source.indexOf(prefix);
    if (start === -1) continue;
    const statementEnd = source.indexOf(";", start + prefix.length);
    if (statementEnd === -1) {
      throw new Error(`${functionName} assignment statement end not found`);
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
      if (aliasPattern.test(statement)) {
        throw new Error(`${functionName} is still read from the deleted preview grid editor facade`);
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
  const mutableContext = context as Record<string, any>;
  const existingGetEditorBootstrapFacade = context._getEditorBootstrapFacade;
  const existingGetEditorSceneFacade = context._getEditorSceneFacade;
  const existingGetEditorInteractionFacade = context._getEditorInteractionFacade;
  const existingGetStageBindingRuntime = context._getStageBindingRuntime;
  const existingGetPointerInteractionRuntime = context._getPointerInteractionRuntime;
  const existingGetSelectionChromeRuntime = context._getSelectionChromeRuntime;
  const existingGetSelectionRuntime = context._getSelectionRuntime;
  const existingGetInspectorDisplayRuntime = context._getInspectorDisplayRuntime;
  const existingGetInspectorMutationRuntime = context._getInspectorMutationRuntime;
  const existingGetInspectorSelectionRuntime = context._getInspectorSelectionRuntime;
  const existingGetArrowWaypointRuntime = context._getArrowWaypointRuntime;
  const existingGetTextEditRuntime = context._getTextEditRuntime;
  const existingGetResizeInteractionRuntime = context._getResizeInteractionRuntime;
  const existingGetEditorRelayoutFacade = context._getEditorRelayoutFacade;
  const existingGetRelayoutRuntime = context._getRelayoutRuntime;
  const existingGetKeyboardRuntime = context._getKeyboardRuntime;
  const readRuntimeParts = () => {
    const bootstrap = typeof existingGetEditorBootstrapFacade === "function"
      ? existingGetEditorBootstrapFacade()
      : {};
    const scene = typeof existingGetEditorSceneFacade === "function"
      ? existingGetEditorSceneFacade()
      : {};
    const interaction = typeof existingGetEditorInteractionFacade === "function"
      ? existingGetEditorInteractionFacade()
      : {};
    const stageBinding = typeof existingGetStageBindingRuntime === "function"
      ? existingGetStageBindingRuntime()
      : interaction.getStageBindingRuntime?.() ?? {};
    const pointer = typeof existingGetPointerInteractionRuntime === "function"
      ? existingGetPointerInteractionRuntime()
      : interaction.getPointerInteractionRuntime?.() ?? {};
    const selectionChrome = typeof existingGetSelectionChromeRuntime === "function"
      ? existingGetSelectionChromeRuntime()
      : interaction.getSelectionChromeRuntime?.() ?? {};
    const selection = typeof existingGetSelectionRuntime === "function"
      ? existingGetSelectionRuntime()
      : interaction.getSelectionRuntime?.() ?? {};
    const inspectorDisplay = typeof existingGetInspectorDisplayRuntime === "function"
      ? existingGetInspectorDisplayRuntime()
      : interaction.getInspectorDisplayRuntime?.() ?? {};
    const inspectorMutation = typeof existingGetInspectorMutationRuntime === "function"
      ? existingGetInspectorMutationRuntime()
      : interaction.getInspectorMutationRuntime?.() ?? {};
    const inspectorSelection = typeof existingGetInspectorSelectionRuntime === "function"
      ? existingGetInspectorSelectionRuntime()
      : interaction.getInspectorSelectionRuntime?.() ?? {};
    const arrowWaypoint = typeof existingGetArrowWaypointRuntime === "function"
      ? existingGetArrowWaypointRuntime()
      : interaction.getArrowWaypointRuntime?.() ?? {};
    const textEdit = typeof existingGetTextEditRuntime === "function"
      ? existingGetTextEditRuntime()
      : interaction.getTextEditRuntime?.() ?? {};
    const resize = typeof existingGetResizeInteractionRuntime === "function"
      ? existingGetResizeInteractionRuntime()
      : interaction.getResizeInteractionRuntime?.() ?? {};
    const relayoutFacade = typeof existingGetEditorRelayoutFacade === "function"
      ? existingGetEditorRelayoutFacade()
      : {};
    const relayoutRuntime = typeof existingGetRelayoutRuntime === "function"
      ? existingGetRelayoutRuntime()
      : relayoutFacade.getRelayoutRuntime?.() ?? {};
    const keyboard = typeof existingGetKeyboardRuntime === "function"
      ? existingGetKeyboardRuntime()
      : interaction.getKeyboardRuntime?.() ?? {};
    const interactionFacade = {
      ...interaction,
      buildTreeUi: stageBinding.buildTreeUi ?? interaction.buildTreeUi ?? context.buildTreeUI,
      bindInteraction: stageBinding.bindInteraction ?? interaction.bindInteraction ?? context.bindInteraction,
      onSvgDoubleClick: pointer.onSvgDoubleClick ?? interaction.onSvgDoubleClick ?? context.onSvgDblClick,
      onSvgMouseDown: pointer.onSvgMouseDown ?? interaction.onSvgMouseDown,
      onDragMove: pointer.onDragMove ?? interaction.onDragMove,
      onDragUp: pointer.onDragUp ?? interaction.onDragUp,
      showResizeHandles:
        selectionChrome.showResizeHandles ?? interaction.showResizeHandles ?? context.showResizeHandles,
      removeResizeHandles:
        selectionChrome.removeResizeHandles ?? interaction.removeResizeHandles ?? context.removeResizeHandles,
      startTextEdit: textEdit.startTextEdit ?? interaction.startTextEdit,
      commitTextEdit: textEdit.commitTextEdit ?? interaction.commitTextEdit,
      cancelTextEdit: textEdit.cancelTextEdit ?? interaction.cancelTextEdit,
      startResize: resize.startResize ?? interaction.startResize,
      onResizeMove: resize.onResizeMove ?? interaction.onResizeMove,
      onResizeUp: resize.onResizeUp ?? interaction.onResizeUp,
      onDocumentKeyDown: keyboard.onDocumentKeyDown ?? interaction.onDocumentKeyDown,
      getStageBindingRuntime: interaction.getStageBindingRuntime ?? (() => stageBinding),
      getPointerInteractionRuntime: interaction.getPointerInteractionRuntime ?? (() => pointer),
      getSelectionChromeRuntime: interaction.getSelectionChromeRuntime ?? (() => selectionChrome),
      getSelectionRuntime: interaction.getSelectionRuntime ?? (() => selection),
      getInspectorDisplayRuntime: interaction.getInspectorDisplayRuntime ?? (() => inspectorDisplay),
      getInspectorMutationRuntime: interaction.getInspectorMutationRuntime ?? (() => inspectorMutation),
      getInspectorSelectionRuntime: interaction.getInspectorSelectionRuntime ?? (() => inspectorSelection),
      getArrowWaypointRuntime: interaction.getArrowWaypointRuntime ?? (() => arrowWaypoint),
      getTextEditRuntime: interaction.getTextEditRuntime ?? (() => textEdit),
      getResizeInteractionRuntime: interaction.getResizeInteractionRuntime ?? (() => resize),
      getKeyboardRuntime: interaction.getKeyboardRuntime ?? (() => keyboard),
    };
    return { bootstrap, scene, interaction: interactionFacade, stageBinding, pointer, selectionChrome, selection, inspectorDisplay, inspectorMutation, inspectorSelection, arrowWaypoint, textEdit, resize, keyboard, relayoutFacade, relayoutRuntime };
  };
  mutableContext._getEditorBootstrapFacade ??= () => readRuntimeParts().bootstrap;
  mutableContext._getEditorSceneFacade ??= () => readRuntimeParts().scene;
  mutableContext._getEditorRelayoutFacade ??= () => readRuntimeParts().relayoutFacade;
  mutableContext._getEditorInteractionFacade ??= () => readRuntimeParts().interaction;
  mutableContext._getStageBindingRuntime ??= () => readRuntimeParts().stageBinding;
  mutableContext._getPointerInteractionRuntime ??= () => readRuntimeParts().pointer;
  mutableContext._getSelectionChromeRuntime ??= () => readRuntimeParts().selectionChrome;
  mutableContext._getRelayoutRuntime ??= () => readRuntimeParts().relayoutRuntime;
  mutableContext._getKeyboardRuntime ??= () => readRuntimeParts().keyboard;
  mutableContext._getSelectionRuntime ??= () => readRuntimeParts().selection;
  mutableContext._getInspectorDisplayRuntime ??= () => readRuntimeParts().inspectorDisplay;
  mutableContext._getInspectorMutationRuntime ??= () => readRuntimeParts().inspectorMutation;
  mutableContext._getInspectorSelectionRuntime ??= () => readRuntimeParts().inspectorSelection;
  mutableContext._getArrowWaypointRuntime ??= () => readRuntimeParts().arrowWaypoint;
  mutableContext._getTextEditRuntime ??= () => readRuntimeParts().textEdit;
  mutableContext._getResizeInteractionRuntime ??= () => readRuntimeParts().resize;
  mutableContext._resolvePrimarySelectedId ??= (preferredCid?: string | null) => (
    context.window?.__DG_getPreviewShellInteractionContract?.()
      ?.resolvePrimarySelectedId?.(context.selectedIds, preferredCid)
  );
  return context;
}

export function createPreviewRuntimeFacade<T extends Record<string, any>>(context: T): Record<string, unknown> {
  attachPreviewCompat(context);
  const bootstrap = context._getEditorBootstrapFacade?.() ?? {};
  const scene = context._getEditorSceneFacade?.() ?? {};
  const interaction = context._getEditorInteractionFacade?.() ?? {};
  const relayoutFacade = context._getEditorRelayoutFacade?.() ?? {};
  const stageBinding = context._getStageBindingRuntime?.() ?? interaction.getStageBindingRuntime?.() ?? {};
  const pointer = context._getPointerInteractionRuntime?.() ?? interaction.getPointerInteractionRuntime?.() ?? {};
  const selectionChrome = context._getSelectionChromeRuntime?.() ?? interaction.getSelectionChromeRuntime?.() ?? {};
  const selection = context._getSelectionRuntime?.() ?? interaction.getSelectionRuntime?.() ?? {};
  const inspectorDisplay = context._getInspectorDisplayRuntime?.() ?? interaction.getInspectorDisplayRuntime?.() ?? {};
  const inspectorMutation = context._getInspectorMutationRuntime?.() ?? interaction.getInspectorMutationRuntime?.() ?? {};
  const inspectorSelection = context._getInspectorSelectionRuntime?.() ?? interaction.getInspectorSelectionRuntime?.() ?? {};
  const arrowWaypoint = context._getArrowWaypointRuntime?.() ?? interaction.getArrowWaypointRuntime?.() ?? {};
  const textEdit = context._getTextEditRuntime?.() ?? interaction.getTextEditRuntime?.() ?? {};
  const resize = context._getResizeInteractionRuntime?.() ?? interaction.getResizeInteractionRuntime?.() ?? {};
  const relayoutRuntime = context._getRelayoutRuntime?.() ?? relayoutFacade.getRelayoutRuntime?.() ?? {};
  const keyboard = context._getKeyboardRuntime?.() ?? interaction.getKeyboardRuntime?.() ?? {};
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
        ?? context.refreshLayoutGridInfoFromLayout,
      rebuildArrowSvg: arrowWaypoint.rebuildArrowSvg ?? context.rebuildArrowSVG,
      loadSvg: bootstrap.loadSvg ?? context.loadSVG,
  };
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
    _cancelLayoutResizeRelayout() {},
    _persistResizeToLayout() {},
    cycleGuideMode() {},
    requestLayoutRelayout() {
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

