
# Inbox

Drop notes here. The agent will triage items into `TODO.md`, then empty this file back to its template header.


we havea problem wit hthe frame variant selector:
1) original means nothing; it should show the actual variant that was chosen when last saved or created.
2) we need t obe able to set a frame to "pass-through - no styling whatsoever, for cases like these where the chosen parent styling is inappropriate -  it would have been a parent if it had a heading, without one it's just an autolayout wrapper with should not have padding, border, background, etc ![alt text](image-2.png)


below is a gpt5.4 architectural review; pls triage and write a spec-kit spec to address the findings:
"
Findings
[P1] Unsupported engine names are already accepted at the YAML/schema layer but are not actually hostable in the preview/runtime. frame_loader.py (line 308), test_frame_loader.py (line 224), and diagram-schema.json (line 36) all bless elk-force, but the manifest only registers elk-layered, force, and sequence in registry.ts (line 8), the bridge only special-cases elk-layered in layout-bridge.js (line 1597), and the ELK frame path only imports layered layout in elk-layout.ts (line 5). An elk-force YAML would currently be accepted, then rendered through the wrong path. That is real architectural drift against Spec 035’s “one YAML, multiple compatible engines” goal.

[P1] Force preview still diverges from the spec 025/026 save contract. force.js (line 1042) posts an exported snapshot and marks itself saved locally; preview_server.py (line 1575) returns only {"ok":true} instead of canonical persisted state; test_preview_force_api.py (line 233) locks that behavior in; and spec 029 (line 13) already calls out the same gap. YAML is still the only persisted authority, but force has not converged on the shared shell/save semantics.

[P1] The current worktree snapshot is not healthy enough to call green. npm --prefix packages/layout-engine test fails in sequence-layout-render-svg.test.ts (line 54) because the test still expects hard-coded arrowhead geometry while render-svg.ts (line 92) now uses shared token/frame-class geometry. That may be transient because another agent is actively editing, but as of this audit the branch is not merge-clean.

[P2] The repo still violates its own no-localStorage rule in the live editing path. layout-bridge.js (line 1461) persists ELK debug/raw-view toggles to localStorage. This is not diagram-state authority, but it is still a direct policy breach and drift bait.

[P2] Spec 035’s key prerequisite is still missing: there is no typed compatibility contract in the preview-engine model. types.ts (line 27) defines capabilities but nothing about document compatibility, registry.ts (line 90) resolves a single engine from layoutEngine/shellMode, and 035 plan (line 5) still lists compatibility as the first unstarted phase. So the repo is not yet architecturally ready for “cycle all supported algorithms on one YAML” without another bounded design slice.

Assessment
The core spine from specs 025/026 is real and mostly coherent: TS owns engine metadata, the shell is thinner, preview-document compilation is TS-first, and YAML remains the persisted source of truth. I did not find JSON sidecars acting as diagram/editor authority, and recent sequence/ELK-force code is TypeScript-first rather than a Python backslide.
Mermaid itself is not the drift point. The Mermaid/D2 work is adapter-shaped and clean: export-mermaid.ts (line 171) and export-d2.ts (line 249) sit on top of the AST instead of becoming runtime authorities. Sequence is also following the right architecture: compile.ts (line 26) normalizes a top-level sequence: block, emit-preview-document-json.mjs (line 24) emits a TS-owned kind: "sequence" preview document, and layout-bridge.js (line 2157) renders it via TS. That is the correct direction.
The places where the architecture is starting to fray are force convergence and engine-surface consistency. Right now the repo has one good architecture for “one canonical YAML -> one TS-owned preview lane,” but not yet a clean architecture for “one canonical YAML -> many compatible engines.” The biggest blocker for Spec 035 is that engine names have started to spread faster than the compatibility/runtime contract.
Validation
npm --prefix packages/layout-engine test → 317 passed, 1 failed.
npm --prefix packages/graph-layout-elk test → all 11 passed.
python -m pytest scripts/test_preview_engine_manifest.py scripts/test_preview_force_api.py scripts/test_preview_elk_controller.py scripts/test_preview_layout_bridge_boundaries.py scripts/test_preview_save_client.py scripts/test_preview_editor_state.py -q → 25 passed.
node packages/layout-engine/scripts/emit-preview-document-json.mjs specs/030-sequence-layout/fixtures/service-handshake.author-v1.yaml → emitted a valid kind: "sequence" preview document.
node packages/layout-engine/scripts/export-sequence-svg.mjs specs/030-sequence-layout/fixtures/service-handshake.author-v1.yaml → emitted SVG successfully.
Net: architecturally sound enough to keep building on specs 025/026, not yet clean enough to claim “no drift” or “ready for spec 035 engine cycling.” Force and elk-force are the areas to tighten first; Mermaid/sequence are mostly respecting the intended direction."