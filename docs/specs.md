# Specs

## Purpose

List the external sources, reference assets, and sibling repos that govern this repo.

If a sketch, reference export, or explicitly linked local asset governs a diagram, treat that source as the highest-priority visual truth and list it here.

Use this file to answer two questions quickly:

1. What source material governs diagram behavior or workflow here?
2. Which sibling repos are references versus sources of truth?

## Spec packages

Active spec packages stay under `specs/`. Completed or retired packages move to `docs/spec-archive/` and are excluded from Cursor indexing by `.cursorignore` and `.cursorindexingignore`.

For spec-driven implementation, keep git aligned to the spec package:

- branch name: `feat/<id>-<slug>`
- one active spec per branch
- merge and delete the feature branch when the spec closes
- archive the completed package under `docs/spec-archive/`

`Closeout Ready` is a verification gate, not an aspirational label. Specs that touch the preview override/save path must have at least one repo-owned save round-trip regression (`persist -> reload`) before moving to `Closeout Ready`.

### Active packages

| Spec | Path | Status | Summary |
|------|------|--------|---------|
| 006 Arrow routing redesign | `specs/006-arrow-routing-redesign/` | Draft | Contract-driven routing overhaul with explicit ports, hierarchy-aware obstacles, deterministic side selection, and layout-owned geometry. |
| 018 PNG export | `specs/018-png-export/` | Draft | Preview **Save PNG** + slug batch CLI; rasterize TS SVG via Playwright; `diagrams/2.output/v3/png/`. |
| 028 Diagram interchange (Mermaid & D2) | `specs/028-diagram-interchange-mermaid-d2/` | Draft | Bidirectional interchange: import parsers, fidelity matrix, export hardening, round-trip CLIs; builds on the archived spec 022 adapters. |
| 041 Text-block inline editing | `specs/041-text-block-inline-editing/` | Draft | Make preview inline editing block-scoped, theme-safe, and semantically faithful to `heading` vs `label`. |
| 042 Implicit ELK side ports | `specs/042-implicit-elk-side-ports/` | Draft | Add automatic midpoint side ports to ELK layered so edge attachment becomes deterministic without YAML-authored port definitions. |
| 046 Editor host endgame | `specs/046-editor-host-endgame/` | Closeout Ready | Preview-shell closeout package: the architecture bar is met; only administrative closeout/verification should remain unless future work regresses by widening legacy browser-shell integration sinks or central engine/document branches. |
| 047 Render IR unification | `specs/047-render-ir-unification/` | Closeout Ready | Render-convergence package: preview fresh render and export SVG now consume the shared display-list IR path, `svg-render.ts` is a thin compatibility wrapper, and bridge/waypoint lanes are reduced to preview-only mutation owners over shared geometry primitives. |
| 048 ELK sizing and interaction follow-up | `specs/048-elk-sizing-interaction-followup/` | Closeout Ready | Current ELK product follow-up: preserve Fill/Hug/Fixed semantics, rerun text measurement on width changes, add live resize feedback, align parent text insets, and harden ELK option/debug surfaces without reopening 046. |
| 051 Preview editor contextual aside | `specs/051-preview-editor-contextual-aside/` | Draft | Figma-like right-aside cleanup: engine and selection driven visibility for Browse/Layers, Selection, Engine, Grid, ELK, Document, Diagnostics, and force-only controls. |
| 052 Layout engine onboarding factory and multi-engine port | `specs/052-layout-engine-onboarding-port/` | Closeout Ready | Onboarding substrate is done (`defineGraphLayoutPreviewEngine` factory, per-engine contract tests, bundle-freshness/no-central-branching gates, product-suitable elkjs algorithms + dagre). Phase 6 fixed the live runtime regressions: explicit incompatible engines no longer silently degrade to v3, ELK layered works on compound/container-endpoint fixtures, authored ELK -> v3 save/reload persists, and sequence documents route/render through the sequence engine without clipped notes. |
| 054 Preview persistence model TypeScript migration | `specs/054-preview-persistence-model-typescript/` | Closeout Ready | JS-owned preview save payload assembly is retired behind the typed override owner; emitted save keys now share frame/arrow/engine-layout contracts, `app-save-payload.ts` is a guard layer, and repo-owned save round-trip coverage gates future persistence work. |
| 055 Preview engine workspace navigation | `specs/055-preview-engine-workspace-navigation/` | Closeout Ready | Engine switching needs a typed workspace model: compatible-engine tabs/prev-next navigation, explicit reopen/save semantics across engine tabs, and hidden inactive engine chrome instead of noisy disabled leftovers. |
| 056 Arrow reroute structural mutations | `specs/056-arrow-reroute-structural-mutations/` | Closeout Ready | Structural edits such as page-direction changes and resize interactions must invalidate and recompute routed arrows through a typed reroute trigger contract so attachments survive live edit and reload. |
| 057 Graph engine fidelity and example fit | `specs/057-graph-engine-fidelity-and-example-fit/` | In Progress | Tighten engine/example fit and ELK-family fidelity: only expose product-suitable engines, preserve direction-aware fill semantics, and stop compound child nodes from visually dropping or stranding on representative examples. |
| 058 Layer tree and inspector selection ergonomics | `specs/058-layer-tree-inspector-selection-ergonomics/` | In Progress | Restore layer-tree keyboard traversal and make the inspector resolve effective child-box variants cleanly instead of showing `unknown` for ordinary selections. |
| 059 Cross-document style source of truth | `specs/059-cross-document-style-source-of-truth/` | In Progress | Unify shared box rhythm and engine identity across document kinds so sequence and frame examples consume one reusable style contract instead of drifting through renderer-local spacing logic. |
| 060 Output pane engine tabs and live rerender | `specs/060-output-pane-engine-tabs-rerender/` | In Progress | Replace the sidebar-local engine switcher with output-pane baseline-foundry tabs that rerender the live graph immediately, while preserving browser-local save/reopen semantics for multi-engine frame previews. |
| — | `specs/ADVERSARIAL_REVIEW_PROMPT.md` | Template | Copy-paste prompt for post-session adversarial reviews. |


Archived completed packages: [`docs/spec-archive/README.md`](./spec-archive/README.md)

## Source docs and reference assets

Rows marked ⚠ reference assets excluded by `.gitignore`. Run the build or obtain them from the team.

| Source | Path | Role |
|--------|------|------|
| Stakeholder how-to | `docs/stakeholder-guide.md` | Copy YAML → preview → save → export SVG (non-engineering) |
| Workflow rules | `AGENTS.md` | Canonical repo workflow, shell, validation, cold-start, and handover |
| Agent index | `docs/agent-index.md` | Trap files, tier-2 flow maps, scoped search |
| Diagram language spec | `DIAGRAM.md` | Authoring rules and output constraints (Layer 3 — Style); runtime constants in `tokens.ts` / `frame-classes.ts` |
| Status (retired) | `STATUS.md` | Pointer stub → `AGENTS.md#handover` |
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
- `DIAGRAM.md` is the Layer 3 (Style) authoring authority; code constants in `tokens.ts` / `frame-classes.ts` are the runtime source of truth. See "Design compass" for upstream spec paths.
- draw.io libraries improve reuse for future insertions but do not live-update shapes already placed in diagrams; repo-wide style changes still require a batch XML update strategy.
- `scripts/export_drawio_library.py` regenerates the tracked draw.io library, `scripts/drawio_style_presets.py` defines the canonical shared draw.io style-field presets, and `scripts/drawio_style_sync.py` is the batch rewrite path for applying those presets or other token-targeted draw.io style changes.
- Sibling repos can inform workflow or style, but they do not outrank an explicitly referenced local sketch or reference asset.
- Keep this file focused on governing references and repo relationships, not active tasks or handoff notes.
