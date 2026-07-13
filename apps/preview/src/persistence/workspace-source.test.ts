import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  formatQualifiedSlug,
  isBareSlug,
  parseQualifiedSlug,
  type DiagramWorkspaceSource,
} from "../preview-host/workspace/diagram-workspace-source.js";
import { WorkspaceRegistry } from "../preview-host/workspace/workspace-registry.js";
import {
  createServerRootSource,
  resolveContainedFramePath,
} from "../preview-host/workspace/server-root-source.js";

function tempDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function stubSource(id: string): DiagramWorkspaceSource {
  return {
    id,
    label: id,
    kind: "server-root",
    writable: true,
    list: () => [],
    has: () => false,
    read: () => "",
    write: () => undefined,
  };
}

test("formatQualifiedSlug / parseQualifiedSlug round-trip and reject malformed", () => {
  assert.equal(formatQualifiedSlug("default", "tiered-network"), "default:tiered-network");
  assert.deepEqual(parseQualifiedSlug("default:tiered-network"), {
    sourceId: "default",
    slug: "tiered-network",
  });

  // Bare slugs are not qualified addresses.
  assert.equal(parseQualifiedSlug("tiered-network"), null);
  // A second colon leaves an unsafe slug.
  assert.equal(parseQualifiedSlug("a:b:c"), null);
  // Leading / trailing colon.
  assert.equal(parseQualifiedSlug(":slug"), null);
  assert.equal(parseQualifiedSlug("source:"), null);

  assert.throws(() => formatQualifiedSlug("bad id", "slug"));
  assert.throws(() => formatQualifiedSlug("source", "../escape"));

  assert.ok(isBareSlug("a-b_c.1"));
  assert.ok(!isBareSlug(".."));
  assert.ok(!isBareSlug("a/b"));
  assert.ok(!isBareSlug("a:b"));
});

test("WorkspaceRegistry preserves order, rejects duplicate ids, and resolves addresses", () => {
  const a = stubSource("alpha");
  const b = stubSource("beta");
  const registry = new WorkspaceRegistry([a, b]);

  assert.deepEqual(
    registry.list().map((source) => source.id),
    ["alpha", "beta"],
  );
  assert.equal(registry.defaultSource(), a);
  assert.throws(() => registry.register(stubSource("alpha")));

  // Bare slug resolves against the default source.
  assert.deepEqual(registry.resolve("diagram"), { source: a, slug: "diagram" });
  // Qualified slug resolves to the named source.
  assert.deepEqual(registry.resolve("beta:diagram"), { source: b, slug: "diagram" });
  // Unknown source id resolves to null.
  assert.equal(registry.resolve("gamma:diagram"), null);

  // An empty registry cannot resolve anything.
  assert.equal(new WorkspaceRegistry().resolve("diagram"), null);
});

test("server-root source lists, reads, and writes within its directory", () => {
  const dir = tempDir("dg-ws-root-");
  fs.writeFileSync(path.join(dir, "b-diagram.yaml"), "engine: v3\n", "utf8");
  fs.writeFileSync(path.join(dir, "a-diagram.yaml"), "engine: v3\n", "utf8");
  fs.writeFileSync(path.join(dir, "not-yaml.txt"), "ignore", "utf8");

  const source = createServerRootSource({ id: "default", label: "Diagrams", dir });

  // Sorted, yaml-only, qualified ids.
  assert.deepEqual(
    source.list().map((entry) => entry.slug),
    ["a-diagram", "b-diagram"],
  );
  assert.deepEqual(
    source.list().map((entry) => entry.qualifiedId),
    ["default:a-diagram", "default:b-diagram"],
  );

  assert.ok(source.has("a-diagram"));
  assert.ok(!source.has("missing"));
  assert.equal(source.read("a-diagram"), "engine: v3\n");

  source.write("a-diagram", "engine: v3\ntitle: Updated\n");
  assert.equal(source.read("a-diagram"), "engine: v3\ntitle: Updated\n");
});

test("server-root persist -> reload round-trips through the source", () => {
  const dir = tempDir("dg-ws-persist-");
  const slug = "round-trip";
  const source = createServerRootSource({ id: "default", label: "Diagrams", dir });

  const yaml = "engine: v3\nroot:\n  id: page\n  children: []\narrows: []\n";
  source.write(slug, yaml);

  // Reload through the source and directly off disk: both identical.
  assert.equal(source.read(slug), yaml);
  assert.equal(fs.readFileSync(path.join(dir, `${slug}.yaml`), "utf8"), yaml);
});

test("read-only server-root source refuses writes", () => {
  const dir = tempDir("dg-ws-ro-");
  fs.writeFileSync(path.join(dir, "example.yaml"), "engine: v3\n", "utf8");
  const source = createServerRootSource({
    id: "examples",
    label: "Examples",
    dir,
    kind: "bundled-examples",
    writable: false,
  });

  assert.equal(source.writable, false);
  assert.equal(source.read("example"), "engine: v3\n");
  assert.throws(() => source.write("example", "engine: v3\n# edited\n"), /read-only/);
});

test("realpath containment rejects traversal, absolute, and separator slugs", () => {
  const dir = tempDir("dg-ws-safe-");

  assert.equal(resolveContainedFramePath(dir, "../escape"), null);
  assert.equal(resolveContainedFramePath(dir, "sub/child"), null);
  assert.equal(resolveContainedFramePath(dir, path.resolve(dir, "..", "escape")), null);
  assert.equal(resolveContainedFramePath(dir, ".."), null);

  // A legitimate slug resolves inside the root.
  const ok = resolveContainedFramePath(dir, "legit");
  assert.ok(ok && ok.startsWith(fs.realpathSync(dir)));
});

test("realpath containment rejects symlink escape", (t) => {
  const root = tempDir("dg-ws-symroot-");
  const outside = tempDir("dg-ws-outside-");
  fs.writeFileSync(path.join(outside, "secret.yaml"), "engine: v3\n# secret\n", "utf8");

  try {
    fs.symlinkSync(path.join(outside, "secret.yaml"), path.join(root, "escape.yaml"));
  } catch {
    t.skip("symlink creation not permitted on this platform");
    return;
  }

  // The symlink target lives outside the root, so it must be rejected.
  assert.equal(resolveContainedFramePath(root, "escape"), null);
  const source = createServerRootSource({ id: "default", label: "Diagrams", dir: root });
  assert.ok(!source.has("escape"));
  assert.throws(() => source.read("escape"));
});
