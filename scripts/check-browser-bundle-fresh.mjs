#!/usr/bin/env node

import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

const SOURCE_ROOTS = [
  path.join(ROOT, "packages", "layout-engine", "src"),
];

const BROWSER_ARTIFACTS = [
  path.join(ROOT, "packages", "layout-engine", "dist", "layout-engine.iife.js"),
  path.join(ROOT, "packages", "layout-engine", "dist", "layout-engine-harfbuzz.js"),
  path.join(ROOT, "packages", "layout-engine", "dist", "preview-engine-manifest.json"),
];

async function listFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFiles(abs)));
    } else if (entry.isFile()) {
      files.push(abs);
    }
  }
  return files;
}

function rel(absPath) {
  return path.relative(ROOT, absPath).replaceAll(path.sep, "/");
}

async function newestSourceFile() {
  const files = (await Promise.all(SOURCE_ROOTS.map((root) => listFiles(root)))).flat();
  if (files.length === 0) {
    throw new Error("No layout-engine source files found for browser-bundle freshness check.");
  }

  let newest = { path: files[0], mtimeMs: 0 };
  for (const file of files) {
    const info = await stat(file);
    if (info.mtimeMs > newest.mtimeMs) {
      newest = { path: file, mtimeMs: info.mtimeMs };
    }
  }
  return newest;
}

async function artifactInfo(artifactPath) {
  try {
    const info = await stat(artifactPath);
    return { path: artifactPath, mtimeMs: info.mtimeMs };
  } catch (error) {
    if (error?.code === "ENOENT") {
      throw new Error(`Missing browser artifact: ${rel(artifactPath)}`);
    }
    throw error;
  }
}

const newestSource = await newestSourceFile();
const artifacts = await Promise.all(BROWSER_ARTIFACTS.map(artifactInfo));
const staleArtifacts = artifacts.filter((artifact) => artifact.mtimeMs < newestSource.mtimeMs);

if (staleArtifacts.length > 0) {
  console.error("layout-engine browser bundle is stale.");
  console.error(`Newest source: ${rel(newestSource.path)}`);
  console.error("Stale artifact(s):");
  for (const artifact of staleArtifacts) {
    console.error(`- ${rel(artifact.path)}`);
  }
  console.error("Run: npm --prefix packages/layout-engine run build:browser");
  process.exit(1);
}

console.log(
  `layout-engine browser bundle fresh (${artifacts.length} artifacts checked against ${SOURCE_ROOTS.length} source root).`,
);
