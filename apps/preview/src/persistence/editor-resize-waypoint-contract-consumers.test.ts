import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";

import {
  attachPreviewCompat,
  extractNamedFunctionSource,
  normalizeVmValue,
  readPreviewScript,
} from "./preview-script-test-helpers.js";

test("editor resize host helpers accept the namespaced previewShell.interaction contract", () => {
  const source = readPreviewScript("editor.js");
  const capturedCalls: Array<Record<string, unknown>> = [];
  const context = {
    console,
    _getResizeInteractionRuntime() {
      return {
        startResize(event: Record<string, unknown>) {
          capturedCalls.push({
            kind: "runtimeStartResize",
            clientX: event.clientX,
            clientY: event.clientY,
          });
        },
        onResizeMove(event: Record<string, unknown>) {
          capturedCalls.push({
            kind: "runtimeResizeMove",
            clientX: event.clientX,
            clientY: event.clientY,
          });
        },
      };
    },
    window: {
      __DG_getPreviewShellInteractionContract() {
        return context.LayoutEngine.previewShell.interaction;
      },
    },
    LayoutEngine: {
      previewShell: {
        interaction: {
          startPreviewResizeHost(options: Record<string, unknown>) {
            capturedCalls.push({ kind: "startPreviewResizeHost", ...options });
          },
          dispatchPreviewResizeMoveHost(options: Record<string, unknown>) {
            capturedCalls.push({ kind: "dispatchPreviewResizeMoveHost", ...options });
          },
        },
      },
    },
  };

  const helperSource = [
    extractNamedFunctionSource(source, "startResize", "(e)"),
    extractNamedFunctionSource(source, "onResizeMove", "(e)"),
    "this.__loaded = { startResize, onResizeMove };",
  ].join("\n");

  vm.runInNewContext(helperSource, attachPreviewCompat(context));
  const loaded = (context as {
    __loaded: {
      startResize: (event: Record<string, unknown>) => void;
      onResizeMove: (event: Record<string, unknown>) => void;
    };
  }).__loaded;

  loaded.startResize({
    target: {
      getAttribute(name: string) {
        const map: Record<string, string> = {
          "data-resize-cid": "alpha",
          "data-resize-axis": "e",
          "data-resize-selection": "single",
        };
        return map[name] ?? null;
      },
    },
    clientX: 100,
    clientY: 120,
    preventDefault() {},
    stopPropagation() {},
  });
  loaded.onResizeMove({
    clientX: 132,
    clientY: 120,
  });

  assert.deepEqual(normalizeVmValue(capturedCalls), [
    {
      kind: "runtimeStartResize",
      clientX: 100,
      clientY: 120,
    },
    {
      kind: "runtimeResizeMove",
      clientX: 132,
      clientY: 120,
    },
  ]);
});


test("editor arrow-waypoint wrappers delegate through the typed runtime", () => {
  const source = readPreviewScript("editor.js");
  const capturedCalls: Array<Record<string, unknown>> = [];
  const context = {
    console,
    _getArrowWaypointRuntime() {
      return {
        showArrowWaypointHandles(cid: string) {
          capturedCalls.push({ kind: "show", cid });
        },
        startWaypointDrag(event: unknown) {
          capturedCalls.push({ kind: "start", eventType: typeof event });
        },
        onWaypointDragMove(event: unknown) {
          capturedCalls.push({ kind: "move", eventType: typeof event });
        },
        onWaypointDragUp(event: unknown) {
          capturedCalls.push({ kind: "up", eventType: typeof event });
        },
        addWaypoint(cid: string, segmentIndex: number, x: number, y: number) {
          capturedCalls.push({ kind: "add", cid, segmentIndex, x, y });
        },
        removeWaypoint(cid: string, index: number) {
          capturedCalls.push({ kind: "remove", cid, index });
        },
        getArrowPoints(cid: string) {
          capturedCalls.push({ kind: "points", cid });
          return [[1, 2]];
        },
        updateArrowVisual(cid: string) {
          capturedCalls.push({ kind: "update", cid });
        },
        rebuildArrowSvg(cid: string) {
          capturedCalls.push({ kind: "rebuild", cid });
        },
      };
    },
  };

  const helperSource = [
    extractNamedFunctionSource(source, "showArrowWaypointHandles", "(cid)"),
    extractNamedFunctionSource(source, "startWpDrag", "(e)"),
    extractNamedFunctionSource(source, "onWpDragMove", "(e)"),
    extractNamedFunctionSource(source, "onWpDragUp", "(e)"),
    extractNamedFunctionSource(source, "addWaypoint", "(cid, segIdx, x, y)"),
    extractNamedFunctionSource(source, "removeWaypoint", "(cid, idx)"),
    extractNamedFunctionSource(source, "getArrowPoints", "(cid)"),
    extractNamedFunctionSource(source, "updateArrowVisual", "(cid)"),
    extractNamedFunctionSource(source, "rebuildArrowSVG", "(cid)"),
    "this.__loaded = { showArrowWaypointHandles, startWpDrag, onWpDragMove, onWpDragUp, addWaypoint, removeWaypoint, getArrowPoints, updateArrowVisual, rebuildArrowSVG };",
  ].join("\n");

  vm.runInNewContext(helperSource, attachPreviewCompat(context));
  const loaded = (context as {
    __loaded: {
      showArrowWaypointHandles: (cid: string) => void;
      startWpDrag: (event: unknown) => void;
      onWpDragMove: (event: unknown) => void;
      onWpDragUp: (event?: unknown) => void;
      addWaypoint: (cid: string, segIdx: number, x: number, y: number) => void;
      removeWaypoint: (cid: string, idx: number) => void;
      getArrowPoints: (cid: string) => unknown;
      updateArrowVisual: (cid: string) => void;
      rebuildArrowSVG: (cid: string) => void;
    };
  }).__loaded;

  loaded.showArrowWaypointHandles("arrow-1");
  loaded.startWpDrag({});
  loaded.onWpDragMove({});
  loaded.onWpDragUp();
  loaded.addWaypoint("arrow-1", 1, 24, 32);
  loaded.removeWaypoint("arrow-1", 0);
  assert.deepEqual(normalizeVmValue(loaded.getArrowPoints("arrow-1")), [[1, 2]]);
  loaded.updateArrowVisual("arrow-1");
  loaded.rebuildArrowSVG("arrow-1");

  assert.deepEqual(normalizeVmValue(capturedCalls), [
    { kind: "show", cid: "arrow-1" },
    { kind: "start", eventType: "object" },
    { kind: "move", eventType: "object" },
    { kind: "up", eventType: "undefined" },
    { kind: "add", cid: "arrow-1", segmentIndex: 1, x: 24, y: 32 },
    { kind: "remove", cid: "arrow-1", index: 0 },
    { kind: "points", cid: "arrow-1" },
    { kind: "update", cid: "arrow-1" },
    { kind: "rebuild", cid: "arrow-1" },
  ]);
});

