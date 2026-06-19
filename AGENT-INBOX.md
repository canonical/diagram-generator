# Agent inbox

Machine-generated handoffs and diagnostics go here.

Durable follow-up belongs in `TODO.md`, [`AGENTS.md`](AGENTS.md#handover), or [`docs/specs.md`](docs/specs.md).

---

## Spec 046 Adversarial Review: Still Not Many-Engine Ready (2026-06-19)

**Branch:** `feat/046-editor-host-endgame`

### Verdict

Spec 046 is not closable today. No, the repo cannot add 50, 150, or 500
heterogeneous engines today without widening `editor.js`, `layout-bridge.js`,
`server.ts`, or equivalent central sinks. The branch made real progress, but it
is still a cleaner hardcoded-lane architecture, not a many-engine platform.

### Findings

1. Host onboarding still centralizes in `apps/preview/src/server.ts`. Builtin
   viewer routes are registered directly in `server.ts`, and new lanes still
   need central route/page/save/API decisions. The registry in
   `apps/preview/src/preview-host/registry.ts` is real, but there is no
   package-owned host module discovery or install path.

2. Host page shape is still finite-lane. `PreviewViewerPageOptions.mode` is
   only `"grid" | "force"` in `apps/preview/src/preview-host/types.ts`, while
   page builders are still `buildAutolayoutPreviewViewerHtml(...)` and
   `buildForcePreviewViewerHtml(...)`. A non-grid/non-force runtime stalls here.

3. Document, save, and export authority are not descriptor-owned. `server.ts`
   still has lane-specific endpoints for force save/spec and frame
   preview/tree/grid/SVG. New document kinds need central endpoint work.

4. Engine registration is explicit but not scalable discovery. Builtins are
   installed by an import side effect in
   `packages/layout-engine/src/preview-engine/install-builtins.ts`, and
   `server.ts` snapshots serialized engines once at startup. That is not a
   package ecosystem model.

5. Compatibility logic still contains engine-name branching.
   `packages/layout-engine/src/preview-engine/registry.ts` special-cases
   `engine.id === "elk-layered"`. That is exactly the kind of central policy
   that will rot at 50 engines.

6. Browser shell is still grid/V3/ELK-shaped. `editor.js` rejects non-grid
   shells at startup, and relayout still exposes `requestV3Relayout` /
   `_v3RelayoutRuntime`. This is migration debt, not a platform proof.

7. Non-frame rendering is not adapter-driven end to end. Frame render adapters
   exist, but sequence rendering is still a direct branch in
   `packages/layout-engine/src/preview-shell/app-fresh-render.ts`. A
   Mermaid/sequence/timeline family still needs central renderer wiring.

8. The proof is too shallow. The `mermaid-flowchart` and `bespoke-grid` tests
   in `packages/layout-engine/tests/app-bootstrap.test.ts` prove controller
   callback compatibility only. They do not prove parser, host route, render
   adapter, persistence namespace, export, browser runtime, and save flow
   onboarding.

### What improved

- Engine manifests and `registerPreviewEngine(...)` are real.
- Frame render adapters can now be registered without editing the shared frame
  render helper.
- Frame YAML persistence namespaces are registered through
  `registerFrameYamlEngineLayoutNamespace(...)`.
- Viewer route resolution now goes through a host route registry.
- `editor.js` no longer directly owns ELK panel/save bootstrap in the old way.
- Spec 046 docs now correctly say the spec remains open.

### Remaining blockers to 046 closeout

- Package-owned engine/host/render/persist registration or manifest discovery.
- Descriptor-owned host pages, scripts, routes, save/spec/export APIs.
- Generic document-kind parser/normalizer registration.
- Generic render/export authority for non-frame families.
- Removal of central engine-name compatibility branches.
- Browser runtime capability routing that is not V3/ELK vocabulary in disguise.
- A real non-ELK engine proof that exercises the whole path.

### Recommended direction

Incremental next steps:

- Move builtin host route registration out of `server.ts` into installable host
  modules.
- Make viewer page `mode` open like `PreviewShellMode`.
- Add document-kind and endpoint descriptors to the engine/host contract.
- Convert sequence rendering from direct branch to registered render adapter.

Hard directional corrections:

- Stop treating "registry exists" as "platform ready."
- Make each engine package own one install module: manifest, render adapter,
  host routes, persistence namespaces, scripts, and shell capabilities.
- Cut deprecated V3/ELK aliases once compatibility stops proving useful.

### Proof standard

Close 046 only after one real skeletal non-ELK engine package registers itself
end to end: parser/document kind, manifest, render/export adapter, host
route/page/scripts, persisted options namespace, browser controller behavior or
explicit output-only contract, initial preview, browser refresh, save, and
SVG/export.

Controller-only fake tests do not count.
