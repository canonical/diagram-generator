"use strict";

// layout-bridge.js — thin browser adapter for the typed preview bridge runtime.

const _previewLayoutBridgeInstallRuntime =
  window.__DG_getPreviewBridgeHostContract()
    .createPreviewLayoutBridgeInstallRuntimeFromLegacyBrowserHost({
      ownerDocument: document,
      previewWindow: window,
      slug: window.__DG_CONFIG?.slug || "",
    });

const _layoutBridgeRuntime = _previewLayoutBridgeInstallRuntime.getRuntime();

const _textAdapterBackend = () => _previewLayoutBridgeInstallRuntime.textAdapterBackend();
const setLocalRelayoutOverrideMode = (mode) =>
  _previewLayoutBridgeInstallRuntime.setLocalRelayoutOverrideMode(mode);
const getLocalRelayoutStatus = () => _previewLayoutBridgeInstallRuntime.getLocalRelayoutStatus();
const isLocalRelayoutReady = () => _previewLayoutBridgeInstallRuntime.isLocalRelayoutReady();
const getFrameTreeJson = () => _previewLayoutBridgeInstallRuntime.getFrameTreeJson();
const getPreviewDocumentJson = () => _previewLayoutBridgeInstallRuntime.getPreviewDocumentJson();
const setFrameTreeJson = (json) => _previewLayoutBridgeInstallRuntime.setFrameTreeJson(json || null);

/**
 * Remove frames (and subtrees) from a frame-tree JSON object (mutates in place).
 * @param {object} treeJson
 * @param {string[]} frameIds
 * @returns {string[]}
 */
function applyFrameTreeRemovalsToJson(treeJson, frameIds) {
  return _previewLayoutBridgeInstallRuntime.applyFrameTreeRemovalsToJson(treeJson, frameIds);
}

/** @deprecated Prefer session-only removals via model.removedIds; mutates canonical cache. */
function applyFrameTreeRemovals(frameIds) {
  return _previewLayoutBridgeInstallRuntime.applyFrameTreeRemovals(frameIds);
}

function applySessionRemovalsToDiagramJson(diagramJson, model) {
  return _previewLayoutBridgeInstallRuntime.applySessionRemovalsToDiagramJson(diagramJson, model);
}

async function initLayoutBridge(slug) {
  return _previewLayoutBridgeInstallRuntime.initLayoutBridge(slug);
}

function performLocalRelayout(model, overrides, gridOverrides, opts) {
  return _previewLayoutBridgeInstallRuntime.performLocalRelayout(
    model,
    overrides || {},
    gridOverrides || {},
    opts || null,
  );
}

async function performEngineRelayout(model, overrides, gridOverrides) {
  return _previewLayoutBridgeInstallRuntime.performEngineRelayout(
    model,
    overrides || {},
    gridOverrides || {},
    null,
  );
}

async function performElkRelayout(model, overrides, gridOverrides) {
  return _previewLayoutBridgeInstallRuntime.performElkRelayout(
    model,
    overrides || {},
    gridOverrides || {},
    null,
  );
}

function arrowComponentId(arrow) {
  return _previewLayoutBridgeInstallRuntime.arrowComponentId(arrow);
}

function syncArrowsInModel(model, arrows, routedArrows) {
  return _previewLayoutBridgeInstallRuntime.syncArrowsInModel(model, arrows, routedArrows);
}

function createArrowsSvg(routedArrows, boundsMap) {
  return _previewLayoutBridgeInstallRuntime.createArrowsSvg(routedArrows, boundsMap);
}

function renderFrameTreeToSvg(diagram, result, options) {
  return _previewLayoutBridgeInstallRuntime.renderFrameTreeToSvg(diagram, result, options || null);
}

async function renderFreshSvg(overrides, gridOverrides, model) {
  return _previewLayoutBridgeInstallRuntime.renderFreshSvg(
    overrides || {},
    gridOverrides || null,
    model,
    null,
  );
}

function refreshElkViewMode() {
  return _previewLayoutBridgeInstallRuntime.refreshElkViewMode();
}

_previewLayoutBridgeInstallRuntime.installCompatWindowBindings();
