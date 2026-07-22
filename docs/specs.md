# Specs

## Purpose

List the external sources, reference assets, and sibling repos that govern this repo.

If a sketch, reference export, or explicitly linked local asset governs a diagram, treat that source as the highest-priority visual truth and list it here.

Use this file to answer two questions quickly:

1. What source material governs diagram behavior or workflow here?
2. Which sibling repos are references versus sources of truth?

## Spec packages

> **Role:** this file is the spec **catalog** — every package, its status, a
> one-line summary, and its path, ordered by id. It is the source of truth for
> *what specs exist and their status*. It is **not** the priority queue: for
> *what to work on next*, see [`TODO.md`](../TODO.md).

Active spec packages stay under `specs/`. Completed or retired packages move to `docs/spec-archive/` and are excluded from Cursor indexing by `.cursorignore` and `.cursorindexingignore`.

For spec-driven implementation, keep git aligned to the spec package:

- branch name: `feat/<id>-<slug>`
- one active spec per branch
- merge and delete the feature branch when the spec closes
- archive the completed package under `docs/spec-archive/`

`Closeout Ready` is a verification gate, not an aspirational label. Specs that touch the preview override/save path must have at least one repo-owned save round-trip regression (`persist -> reload`) before moving to `Closeout Ready`.

### Catalog

| Spec | Path | Status | Summary |
|------|------|--------|---------|
| 006 Arrow routing redesign | `specs/006-arrow-routing-redesign/` | Draft | Contract-driven routing overhaul with explicit ports, hierarchy-aware obstacles, deterministic side selection, and layout-owned geometry. |
| 018 PNG export | `specs/018-png-export/` | Draft | Preview **Save PNG** + slug batch CLI; rasterize TS SVG via Playwright; `diagrams/2.output/v3/png/`. |
| 028 Diagram interchange (Mermaid & D2) | `docs/spec-archive/028-diagram-interchange-mermaid-d2/` | Merged to `main` and archived 2026-07-19 | Mermaid-first hand-authored flowchart import, clear non-flowchart rejection, validated canonical-YAML safety, corpus examples, and the existing lossy D2/export interchange surface. |
| 041 Text-block inline editing | `docs/spec-archive/041-text-block-inline-editing/` | Merged to `main` and archived 2026-07-15 | Preview inline editing now targets one semantic text block at a time, preserves other block overrides, and remains legible on light and dark fills. |
| 042 Implicit ELK side ports | `docs/spec-archive/042-implicit-elk-side-ports/` | Merged to `main` and archived 2026-07-15 | ELK layered now owns deterministic midpoint side ports and their native endpoint refs without a preview-side rerouting pass. |
| 046 Editor host endgame | `docs/spec-archive/046-editor-host-endgame/` | Merged to `main` and archived 2026-07-05 | Preview-shell closeout package: the architecture bar is met, the one bounded shell-family panel-registry residual is documented, and future work should treat widening legacy browser-shell integration sinks or central engine/document branches as regression. |
| 047 Render IR unification | `docs/spec-archive/047-render-ir-unification/` | Merged to `main` and archived 2026-07-05 | Render-convergence package: preview fresh render and export SVG now consume the shared display-list IR path, `svg-render.ts` is a thin compatibility wrapper, and bridge/waypoint lanes are reduced to preview-only mutation owners over shared geometry primitives. |
| 048 ELK sizing and interaction follow-up | `docs/spec-archive/048-elk-sizing-interaction-followup/` | Merged to `main` and archived 2026-07-05 | Current ELK product follow-up: Fill/Hug/Fixed semantics, text remeasurement, live resize feedback, parent text insets, and ELK option surfaces remain covered; real pointer-drag evidence now proves `mongo_clients` resizes 224px -> 304px with status `Ready`. |
| 051 Preview editor contextual aside | `docs/spec-archive/051-preview-editor-contextual-aside/` | Merged to `main` and archived 2026-07-05 | Figma-like right-aside cleanup. Live Playwright evidence now proves v3 native controls remain visible, ELK hides native autolayout/grid controls from DOM/Tab order, ELK algorithm controls are contextual, raw view is ELK-only, and the debug overlay/help text are absent. |
| 065 Interactive relayout contract | `specs/065-interactive-relayout-contract/` | Active / blocked on T000 historical baseline | One typed `PreviewRenderIntent` that render/relayout/direction/panel-sync all read. Behavior tasks T010–T050 are real-gesture proven and downstream 060/057/048/051 are reverified; only the uncaptured pre-fix `baseline-fail.json` remains impossible without an explicit waiver/replacement. |
| 052 Layout engine onboarding factory and multi-engine port | `docs/spec-archive/052-layout-engine-onboarding-port/` | Merged to `main` and archived 2026-07-05 | Onboarding substrate is done (`defineGraphLayoutPreviewEngine` factory, per-engine contract tests, bundle-freshness/no-central-branching gates, and the multi-engine port that later let spec 074 retire Dagre while keeping the product ELK-based). Phase 6 fixed the live runtime regressions: explicit incompatible engines no longer silently degrade to v3, ELK layered works on compound/container-endpoint fixtures, authored ELK -> v3 save/reload persists, and sequence documents route/render through the sequence engine without clipped notes. |
| 054 Preview persistence model TypeScript migration | `docs/spec-archive/054-preview-persistence-model-typescript/` | Merged to `main` and archived 2026-07-05 | JS-owned preview save payload assembly is retired behind the typed override owner; emitted save keys now share frame/arrow/engine-layout contracts, `app-save-payload.ts` is a guard layer, and repo-owned save round-trip coverage gates future persistence work. |
| 055 Preview engine workspace navigation | `docs/spec-archive/055-preview-engine-workspace-navigation/` | Merged to `main` and archived 2026-07-05 | Engine switching needs a typed workspace model: compatible-engine tabs/prev-next navigation, explicit reopen/save semantics across engine tabs, and hidden inactive engine chrome instead of noisy disabled leftovers. |
| 056 Arrow reroute structural mutations | `docs/spec-archive/056-arrow-reroute-structural-mutations/` | Merged to `main` and archived 2026-07-05 | Structural edits such as page-direction changes and resize interactions must invalidate and recompute routed arrows through a typed reroute trigger contract so attachments survive live edit and reload. |
| 057 Graph engine fidelity and example fit | `docs/spec-archive/057-graph-engine-fidelity-and-example-fit/` | Merged to `main` and archived 2026-07-05 | Engine/example fit now has real preview-engine fidelity probes, stricter unsupported-engine exposure gates, and browser evidence for the reported Mongo/Tiered fixtures. |
| 058 Layer tree and inspector selection ergonomics | `docs/spec-archive/058-layer-tree-inspector-selection-ergonomics/` | Merged to `main` and archived 2026-07-05 | Layer-tree traversal is owned in typed preview-shell code, and fixture/browser checks prove `test-deep-nesting` child-box variants resolve without `unknown`. |
| 059 Cross-document style source of truth | `docs/spec-archive/059-cross-document-style-source-of-truth/` | Merged to `main` and archived 2026-07-05 | Shared box rhythm is now owned in a reusable TypeScript contract consumed by frame and sequence renderers; sequence browser evidence proves engine identity, one 18px text size, 8px insets, and 64px box rhythm on `service-handshake-sequence`. |
| 060 Output pane engine tabs and live rerender | `docs/spec-archive/060-output-pane-engine-tabs-rerender/` | Merged to `main` and archived 2026-07-05 | Engine switch now commits active engine intent into the frame tree before render and stamps `data-layout-engine`; follow-up must distinguish true no-op rerender bugs from cases where two engines legitimately produce equivalent geometry. See `docs/spec-reviews/branch-060.md`. |
| 061 Preview grid regression investigation | `docs/spec-archive/061-preview-grid-regression/` | Merged to `main` and archived 2026-07-19 | Shared typed grid capability gate now drives the grid panel, 9-dot inspector, and inert runtime boundary. Live Chromium coverage proves V3 guide mounting and V3 → ELK affordance/tab-order retirement; ELK numeric defaults now normalize at the override writer, preserving strict save→reload assertions. |
| 062 Parent/child hug resize propagation | `docs/spec-archive/062-parent-child-hug-resize-propagation/` | Merged to `main` and archived 2026-07-05 | Nested `HUG` container children now recompute width under a smaller parent, unconstrained root/top-level `HUG` widths no longer collapse during constrained remeasurement, and the full SC-005 battery passed after the review hardening rerun. |
| 063 Auto-style by nesting depth | `docs/spec-archive/063-auto-style-by-nesting-depth/` | Merged to `main` and archived 2026-07-05 | Keep the fixed structural encoding `0=wrapper, 1=child, 2=parent, 3=section`; treat sibling promotion as an authoring-time rule, keep the validator advisory while authored frames still contain promotion mismatches, keep appearance-only style changes on the spec 071 repaint path, and drift-guard runtime, picker, docs, skill, and `DIAGRAM.md`. |
| 064 Arrow annotation label de-overlap | `specs/064-arrow-annotation-label-de-overlap/` | Draft | Investigation-first: prove whether stacked arrow labels are genuine geometric overlap or a stale render-node artifact, then fix the real owner and protect it with a regression. spec.md + plan.md + tasks.md drafted; investigation writes `findings.md`. |
| 070 Layers palette reorder | `specs/070-layers-palette-reorder/` | Draft | Add same-parent layer-tree reorder in the preview palette through the existing typed `children_order` override, relayout, undo, and save pipeline. Refreshed 2026-07-05: `plan.md` added and the stray `052-layers-palette-reorder/` flow map + checklist folded in. |
| 071 Preview render node graph | `docs/spec-archive/071-preview-render-node-graph/` | Merged to `main` and archived 2026-07-05 | Houdini-style source→interpreter[]→switch→render model. One render node (single fit/mount), one switch node (single render-intent writer), per-engine interpreter node state isolation, canvas viewBox in the state vector. The closeout pass landed the no-central-branching onboarding proof, post-migration render-path inventory, tightened SC-002 browser evidence, and full validation summary. |
| 072 Preview engine hardening | `docs/spec-archive/072-preview-engine-hardening/` | Merged to `main` and archived 2026-07-04 | Shared preview-engine hardening slice: render-node fitting is structurally guarded, stale engine badge chrome is removed, section-heading spacing now uses the shared +8px contract, sequence/document-kind handling stays out of central owners, builtin install-unit registration is data-driven, browser save→reload→switch-back proof is live, and Playwright browser regressions now skip cleanly when chromium is unavailable. |
| 073 Layout node model and param-pane unification | `docs/spec-archive/073-layout-node-model-param-unification/` | Merged to `main` and archived 2026-07-05 | Adopt the Houdini node model for layout algorithms (no "family" construct); unify parameter surfacing so ELK/Dagre/autolayout/**force** all render params through one shared aside; rename shell lane `grid`→`frame`; make panel/lane registration data-driven (closes 046 T073). Backend-agnostic; keeps the `force-spec` doc kind, with the remaining host-template registration seam and force-pipeline convergence deferred to follow-up spec work. |
| 074 Layout algorithm consolidation (best-of-breed survey) | `docs/spec-archive/074-layout-algorithm-consolidation/` | Merged to `main` and archived 2026-07-05 | Evidence-based, corpus-driven survey (inputs from `diagram-generator-planning`) now committed with the decision matrix and downstream queue; Dagre is removed from runtime and active build/preview wiring with persist->reload migration coverage, builtin engines declare unique `algorithmClass` values under a hard no-duplicate guard, and the review hardening reran green. |
| 075 Preview folder workspaces | `specs/075-preview-folder-workspaces/` | Closeout pending — implementation on `main`; original T045 native picker/regrant evidence remains, and Spec 084 now owns the observed silent-open/hidden-recovery reliability regression | Typed multi-root sources plus browser Open folder now provide grouped qualified nav, multiple persisted handles, reconnect/forget UX, authoritative handle-gated saves, local and server-root conflict protection, read-only Save a copy, bounded ingest, safe YAML, and cache disposal. 2026-07-20 Opus UX/delivery review (`docs/spec-reviews/opus-adversarial-review-findings-2026-07-20-spec-075-ux-delivery.md`) verdict: changes requested / evidence-gated. Non-repo delivery/packaging is Spec 083; in-app native/recovery reliability is Spec 084. |
| 076 Port Mermaid cluster/ELK lowering (TLS example) | `docs/spec-archive/076-tls-mermaid-cold-start-fit/` | Retired — superseded by 077 | Failed approach: never adopted the Mermaid algorithm, lowered cross-cluster edges flat, then owned geometry after ELK (box-moving + local arrow rerouting) and closed on non-rendering snippet asserts. Post-mortem 2026-07-08 in `docs/spec-reviews/076-...`. Kept only as history; do not resume. |
| 077 YAML frame → draw.io export | `specs/077-yaml-drawio-export/` | Closeout pending — manual appearance verification | TypeScript batch exporter: frame YAML → layout → mxGraph `.drawio`; ports draw.io style presets, ai-infra fixture regressions, and explicit light/dark theme pairs. T021/T030 require real diagrams.net Light/Dark/Automatic verification, especially embedded SVG icons. |
| 077 Mermaid ELK cluster lowering port (layout-only) | `docs/spec-archive/077-mermaid-elk-cluster-lowering-port/` | Complete — merged to `main` and archived 2026-07-13 | Generic Mermaid-style cluster lowering, TLS topology, and a non-TLS portability fixture. T054 full validation is green. |
| 079 Figma component variant import | `specs/079-figma-component-variant-import/` | Draft | Local selected-YAML Figma import through `box` component variants and real slots; remaining live-Figma validation plus ownership/refresh gates are tracked in the package. |
| 080 Renderable interchange import | `docs/spec-archive/080-renderable-interchange-import/` | Merged to `main` and archived 2026-07-18 | Capability-based Mermaid and D2 import blocks structural loss through one shared gate; tokenizer/parser/IR handles compound topology, directions, spaced/no-space and labelled edges, styles, decorations, and bounded input; D2 supports scoped implicit endpoints; capability-driven v3/ELK selection persists across reload. T070–T077 close both review passes. |
| 083 Preview folder-workspace delivery shell | `specs/083-preview-folder-workspace-delivery-shell/` | Draft — successor to 075 (D1) | Owns the non-repo delivery gap: let a non-developer launch the preview and reach the 075 folder workflow without a Git checkout, `npm install`, or toolchain setup. Packaging/launch only; no change to 075 in-app UX or save contract. Do not start until 075 closes out. |
| 084 Folder workspace reliability | `specs/084-folder-workspace-reliability/` | Active — user-blocking native folder workflow regression | Makes every Open-folder action observable, restores named local-folder Browse groups reliably, exposes adjacent permission recovery, and requires real Chrome native chooser/regrant evidence. Separate from Spec 083 packaging. |
| — | `docs/spec-reviews/README.md` | Review | 2026-06-28 adversarial review of 054–060 + INBOX reconciliation; per-branch reviews and rewritten gates. |
| — | `specs/ADVERSARIAL_REVIEW_PROMPT.md` | Template | Copy-paste prompt for post-session adversarial reviews. |


Archived completed packages: [`docs/spec-archive/README.md`](./spec-archive/README.md)

## Source docs and reference assets

Rows marked ⚠ reference assets excluded by `.gitignore`. Run the build or obtain them from the team.

| Source | Path | Role |
|--------|------|------|
| Stakeholder how-to | `docs/stakeholder-guide.md` | Copy YAML → preview → save → export SVG (non-engineering) |
| Repo invariants | `AGENTS.md` | Always-on repo invariants + cold-start pointers (auto-loaded every turn) |
| Live state / handover | `AGENT-INBOX.md` | Current task, blockers, last-known-green — session-start read |
| Architecture vision (read on request, **not** cold-start) | `docs/architecture/node-paradigm-and-engine-strategy.md` | Bigger-picture engine/node strategy: Houdini paradigm, one-implementation-per-algorithm hard contract, no "family", force as an engine, design-foundry node-UI home. Point an agent here for the *why*, not the per-task *how*. |
| Agent index | `docs/agent-index.md` | Trap files, tier-2 flow maps, scoped search |
| Diagram language spec | `DIAGRAM.md` | Thin index for the renderer contract; points to runtime authority and authoring guidance without restating the class/level rules |
| Starter block reference | `diagrams/0.reference/sample.svg` | Canonical single-block geometry and arrow treatment |
| Visual preview of starter block | `diagrams/0.reference/sample.png` | Clearer `3x` raster preview of the same canonical block |
| Reusable style copy source | `diagrams/0.reference/onbrand-svg-starter.svg` | Canonical inset rhythm, box proportions, and literal arrow geometry |
| Corpus-backed sequence reference | `docs/corpus-references/service-handshake-sequence-source.png` | Landscape package reporting source image used to compare the spec 030 sequence redraw against the original corpus diagram |
| Tracked draw.io library | `assets/drawio/diagram-generator-primitives.mxlibrary` | Repo-owned reusable library for canonical draw.io primitives |
| Secondary layout reference ⚠ | `diagrams/0.reference/_BRND-3284.drawio.svg` | Connector and broader layout reference |
| Current canonical implementation ⚠ | `diagrams/2.output/svg/memory-wall-onbrand.svg` | Palette, icon placement, side-icon cluster, and scale checkpoint |

## Design compass — canonical specs (living documents)

These three specs are the upstream mathematical foundation for the diagram system's typography, spacing, and grid rules. They currently describe three tiers (applications, documentation, editorial). Diagrams will become a **4th tier** described by each spec — a dense, constrained visual domain with its own scale selections, spacing conventions, and grid presets derived from the same foundations.

The specs are living documents maintained in the sibling `canonical-spacing-spec` repo. Changes to them may affect DIAGRAM.md tokens and renderer behavior. Treat them as the design compass for any typography, spacing, or grid decision in this system.

| Spec | Path | Governs |
|------|------|---------|
| Type scale | `../canonical-spacing-spec/specs/type scale/draft.md` | Modular scale formula, per-tier heading hierarchies, weight pairing, line height selection, baseline grid alignment. Diagram tier will select its own subset of the scale. |
| Spacing | `../canonical-spacing-spec/specs/spacing/draft.md` | Vertical spacing architecture (element-owned vs container-owned), baseline grid and nudge tokens, intra-component padding. Diagram tier will define its own spacing mode and density. |
| Grid | `../canonical-spacing-spec/specs/grid/draft.md` | Column counts, gutter widths, outer margins, bisection rule, nested grid alignment. Diagram tier will define its own grid presets (column counts, baseline unit enforcement). |

**How they flow into this repo:** `packages/layout-engine/src/tokens.ts` and `frame-classes.ts` implement diagram-tier selections from these specs (e.g., 18px body, 8px baseline, 24px gutter). `DIAGRAM.md` documents the resulting contract. When upstream specs change, update the TS constants first, then adjust `DIAGRAM.md` only if the public-facing contract changed.

## External tool references

| Source | Path | Role |
|--------|------|------|
| draw.io scratchpad and custom libraries | `https://www.drawio.com/doc/faq/scratchpad` | Governs how reusable manual components are captured, edited, and exported as library XML |
| draw.io shape styles | `https://www.drawio.com/doc/faq/shape-styles` | Governs style strings, copy and paste style, default styles, and direct style editing |
| draw.io text styles | `https://www.drawio.com/doc/faq/text-styles.html` | Governs text spacing fields such as top, left, bottom, and right padding inside shapes |
| draw.io connector styles | `https://www.drawio.com/doc/faq/connector-styles` | Governs connector defaults, manual style editing, and reusable edge behavior |
| draw.io custom shapes | `https://www.drawio.com/doc/faq/custom-shapes` | Governs custom stencils, inherited styling, and explicit connection points for reusable special shapes |
| draw.io diagram source editing | `https://www.drawio.com/doc/faq/diagram-source-edit` | Governs direct XML editing, source-level merge workflows, and safe save modes |

## Related repos

| Repo | Relationship | Notes |
|------|--------------|-------|
| `design-foundry` | **Eventual home** | This repo's TS layout engine (`packages/layout-engine/`) will port there as `@design-foundry/operator-autolayout`. See `../design-foundry/PIVOT.md` for the full cross-repo plan. |
| `baseline-foundry` | Read-only reference | Upstream BF contract reference; sibling checkout needed only when refreshing vendored preview-shell snapshot under `assets/baseline-foundry/` |
| `canonical-spacing-spec` | Design compass (living upstream) | Upstream source for type scale, spacing, and grid specs governing DIAGRAM.md tokens. Diagrams will become a 4th tier. |
| `diagram-generator-planning` | **Project home + ontology** | Owns the broader Canonical diagram project (Jira DE-941), corpus audit, taxonomy (11 families), Coda pages (9), and Streams A–D. This repo is Stream E (constrained editor). Taxonomy metadata feeds `meta:` blocks in frame YAML. |
| `design.md` | Read-only format reference | Structure reference for the plain-text `DIAGRAM.md` spec |

## Notes

- Local reference assets in this repo are the primary source of truth for diagram visuals.
- `DIAGRAM.md` is now a thin index into the runtime and authoring sources, not an independent class/level rule source. See "Design compass" for upstream spec paths.
- draw.io libraries improve reuse for future insertions but do not live-update shapes already placed in diagrams; repo-wide style changes still require a batch XML update strategy.
- `scripts/export_drawio_library.py` regenerates the tracked draw.io library, `scripts/drawio_style_presets.py` defines the canonical shared draw.io style-field presets, and `scripts/drawio_style_sync.py` is the batch rewrite path for applying those presets or other token-targeted draw.io style changes.
- Sibling repos can inform workflow or style, but they do not outrank an explicitly referenced local sketch or reference asset.
- Keep this file focused on governing references and repo relationships, not active tasks or handoff notes.
