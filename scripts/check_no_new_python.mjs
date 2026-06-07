#!/usr/bin/env node

import { readdir } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const SCRIPTS_DIR = path.join(ROOT, "scripts");

const ALLOWLIST = new Set([
  "create_jira_epic.py",
  "design_tokens.py",
  "diagram_layout.py",
  "diagram_model.py",
  "diagram_shared.py",
  "diagrams/__init__.py",
  "drawio_review_workflow.py",
  "drawio_style_presets.py",
  "drawio_style_sync.py",
  "drawio_style_tokens.py",
  "export_drawio_batch.py",
  "export_drawio_library.py",
  "export_layer3_mpls.py",
  "export_memory_wall_drawio.py",
  "export_png.py",
  "frame_loader.py",
  "frame_model.py",
  "frame_style_classes.py",
  "frame_yaml_persistence.py",
  "layout_v3.py",
  "preview_server.py",
  "preview_ts_export.py",
  "preview_ts_layout.py",
  "quadtree.py",
  "run_elk_save_live_playwright.py",
  "svg_illustrator_sanitize.py",
  "sync_baseline_foundry_assets.py",
  "test_autolayout.py",
  "test_elk_preview_qa.py",
  "test_frame_classes.py",
  "test_frame_loader.py",
  "test_frame_yaml_persistence.py",
  "test_layout_v3.py",
  "test_parity.py",
  "test_preview_browser_test_api.py",
  "test_preview_editor_shell_shrink.py",
  "test_preview_editor_state.py",
  "test_preview_elk_controller.py",
  "test_preview_elk_layout_save.py",
  "test_preview_engine_manifest.py",
  "test_preview_force_api.py",
  "test_preview_frames_dir.py",
  "test_preview_layout_bridge_boundaries.py",
  "test_preview_save_client.py",
  "test_preview_server_reload.py",
  "test_preview_shell_bf_contract.py",
  "test_preview_style_picker_labels.py",
  "test_preview_support_engineering_flow.py",
  "test_preview_ts_api.py",
  "test_preview_ts_export.py",
  "test_preview_ts_layout.py",
  "test_style_parity.py",
  "text_metrics.py",
]);

async function listPyFiles(dir, prefix = "") {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listPyFiles(abs, rel)));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".py")) {
      files.push(rel);
    }
  }
  return files;
}

function isAllowedNewPython(relPath) {
  return path.posix.basename(relPath).startsWith("test_");
}

const files = await listPyFiles(SCRIPTS_DIR);
const unexpected = files.filter((relPath) => !ALLOWLIST.has(relPath) && !isAllowedNewPython(relPath));

if (unexpected.length > 0) {
  console.error("spec 038 ratchet: new Python product-path files are not allowed under scripts/.");
  console.error("Move the behavior to Node / TypeScript or explicitly retire old Python first.");
  console.error("Unexpected files:");
  for (const relPath of unexpected) {
    console.error(`- scripts/${relPath}`);
  }
  process.exit(1);
}

console.log(`spec 038 ratchet: ok (${files.length} Python files scanned, no new product-path files).`);
