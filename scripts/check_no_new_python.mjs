#!/usr/bin/env node

import { readdir } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const SCRIPTS_DIR = path.join(ROOT, "scripts");

const ALLOWLIST = new Set([
  "diagram_shared.py",
  "drawio_review_workflow.py",
  "drawio_style_presets.py",
  "drawio_style_sync.py",
  "drawio_style_tokens.py",
  "export_drawio_batch.py",
  "export_drawio_library.py",
  "export_layer3_mpls.py",
  "export_memory_wall_drawio.py",
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

const files = await listPyFiles(SCRIPTS_DIR);
const unexpected = files.filter((relPath) => !ALLOWLIST.has(relPath));

if (unexpected.length > 0) {
  console.error("spec 038 ratchet: Python is restricted to the retained draw.io lane under scripts/.");
  console.error("Move any new behavior to Node / TypeScript or revive the removed Python from git history explicitly.");
  console.error("Unexpected files:");
  for (const relPath of unexpected) {
    console.error(`- scripts/${relPath}`);
  }
  process.exit(1);
}

console.log(`spec 038 ratchet: ok (${files.length} Python files scanned, no new product-path files).`);
