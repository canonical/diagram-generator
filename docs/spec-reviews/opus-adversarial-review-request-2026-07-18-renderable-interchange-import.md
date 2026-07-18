# Opus adversarial review + spec-authoring request — renderable interchange import

Work from:

`H:\WSL_dev_projects\diagram-generator-worktrees\075-preview-folder-workspaces`

The current branch must be `feat/075-preview-folder-workspaces`. Its HEAD is
expected to contain commit `70086eb` and to be based on current `main`
(`1299bbb` at the time this request was written). Verify those facts; do not
silently review a different branch or stale merge base.

This is an adversarial product/architecture review followed by a durable
spec-authoring pass. It is not a request to implement product code.

## Reported failure

Inspect this screenshot:

`H:\WSL_dev_projects\diagram-generator-worktrees\075-preview-folder-workspaces\import-errors.png`

The folder-workspace import UI reports “Imported with 41 warning(s)”. Visible
examples include:

- `Mermaid statement is outside the supported flowchart subset: direction LR`
- `Mermaid edge could not be imported: power_on["Power On"]:::highlight --> load_spl["Load SPL"]:::leaf`

Treat this as evidence of a materially lossy import, not a cosmetic warning-only
success. A dropped edge or topology/direction statement can make the imported
diagram false even if the resulting YAML compiles.

## Read first

1. `AGENTS.md`
2. `AGENT-INBOX.md`
3. `docs/agent-index.md`
4. `DIAGRAM.md`
5. `specs/028-diagram-interchange-mermaid-d2/spec.md`
6. `specs/028-diagram-interchange-mermaid-d2/plan.md`
7. `specs/028-diagram-interchange-mermaid-d2/tasks.md`
8. `specs/028-diagram-interchange-mermaid-d2/contracts/interchange-fidelity.md`
9. `specs/028-diagram-interchange-mermaid-d2/validation.md`
10. `packages/layout-engine/src/diagram-author/import-mermaid.ts`
11. `packages/layout-engine/src/diagram-author/import-d2.ts`
12. `packages/layout-engine/src/diagram-author/types.ts`
13. `packages/layout-engine/src/diagram-author/import-result.ts`
14. `packages/layout-engine/src/diagram-author/lower-to-frame.ts`
15. `packages/layout-engine/tests/diagram-author-import.test.ts`
16. `packages/graph-layout-elk/src/engine-capabilities.ts`
17. `packages/graph-layout-elk/src/elk-param-registry.ts`
18. `packages/graph-layout-elk/src/elk-graph-builder.ts`
19. `specs/075-preview-folder-workspaces/spec.md`
20. `specs/075-preview-folder-workspaces/tasks.md`
21. `specs/075-preview-folder-workspaces/validation.md`
22. the folder-workspace import route/controller and its persist/reload tests

Also inspect `git diff main...HEAD` and trace the actual import-to-write flow.
Do not infer behavior only from checked task boxes.

## Known hypotheses to challenge with code evidence

The current importer appears narrower than the graph/rendering substrate:

- The line-oriented edge parser begins with a bare node id and accepts bare
  targets. Therefore an ordinary Mermaid edge that declares nodes inline, such
  as `a["A"]:::class --> b["B"]:::class`, is rejected wholesale even though both
  rectangular nodes and the directed edge are representable.
- A subgraph-local `direction TB|TD|BT|LR|RL` is routed to generic unsupported
  syntax even though `AuthorFrameNode` has a local direction and ELK layered
  supports nested compounds and all four graph directions.
- Top-level `RL` and `BT` are accepted but collapsed to horizontal/vertical,
  losing reverse direction. ELK layered has `LEFT` and `UP`; determine whether
  canonical YAML can persist those semantics today and what typed model work is
  required if it cannot.
- `:::class`, `classDef`, `class`, and `style` are always discarded even where
  fill, border, level, variant, role, or another current frame style can preserve
  the intended result.
- Multi-target links, semicolon-separated statements, newer node syntax, edge
  ids, and other flowchart productions were explicitly deferred by spec 028.
  Some can likely be lowered into ordinary frames/arrows without renderer work.
- The current regex-per-line strategy may be the wrong scalability boundary.
  Compare a tokenizer/parser/AST approach against extending ad hoc regexes.

Do not assume these hypotheses are all correct. Verify each against the typed
AST, canonical YAML schema, autolayout, ELK lowering, renderer, preview import,
and persistence code.

## The decision standard

Replace “whatever our exporter happened to emit” and arbitrary enumerated syntax
with a capability-based contract:

> Import every interchange construct whose meaningful graph semantics can be
> faithfully lowered into canonical frame YAML and rendered by at least one
> supported frame engine (v3 autolayout or a registered ELK engine). Downgrade
> only presentation details that are genuinely unrepresentable, with an explicit
> diagnostic. Reject or block import when topology, containment, endpoint,
> direction, or other meaning would be dropped or falsified.

ELK’s large option catalog is not itself a Mermaid grammar. Do not promise “all
Mermaid” merely because ELK can arrange generic graphs. For every proposed
construct, trace:

`source syntax → parsed semantic IR → canonical YAML/AST → engine capability → rendered result → persisted reload`

If one link is absent, say so and create the prerequisite task. Conversely, do
not defer syntax that already has a faithful path merely because the current
parser does not recognize it.

## Required adversarial review

Review at least:

1. Why spec 028 called the visible limitations reasonable, and whether corpus
   selection hid ordinary hand-authored Mermaid usage.
2. Whether “Imported with warnings” is an unsafe success state when nodes, edges,
   containment, or direction were dropped.
3. Whether strict mode’s accepted warning allowlist permits structural loss.
4. Whether preview import, CLI import, server-root import, and local-folder
   import apply identical structural-loss gates.
5. Whether the original interchange source is preserved or recoverable after a
   partial import.
6. Whether automatic engine selection is needed. Define deterministic behavior
   when v3 autolayout can preserve the graph, when ELK layered is required, and
   when neither can.
7. Root and nested directions: `TB`, `TD`, `LR`, `RL`, and `BT`, including the
   distinction between axis and orientation.
8. Inline node declarations on either side of edges, `:::class` suffixes,
   chained inline declarations, edge labels, and later declarations that refine
   an implicit node.
9. Nested subgraphs, cross-subgraph edges, compound endpoints, local directions,
   and selective flattening in the ELK graph builder.
10. Fan-in/fan-out and multi-target syntax that can expand deterministically to
    ordinary directed arrows.
11. Cycles, self-loops, disconnected components, parallel edges, high-degree
    nodes, and edge labels.
12. Which class/style properties can map to existing frame/arrow fields and
    which are truly unrenderable.
13. D2 parity: identify hand-authored D2 constructs already representable by the
    same graph IR. Mermaid is the reported priority, but do not leave a second
    arbitrary exporter-round-trip-only importer without an explicit plan.
14. Parser architecture, complexity limits, malformed-input behavior, security,
    bounded input, deterministic ids, duplicate declarations, and diagnostic
    location quality.
15. False-positive tests: prove topology and containment, not merely zero parser
    errors or compilable YAML.
16. Real preview integration through folder workspaces, including
    `import → persist → reload → render` for both server-root and local-folder
    sources.

Build a source-construct capability matrix. At minimum classify each item as:

- faithfully supported now;
- representable now but parser/import UX missing;
- requires canonical-model or lowering work;
- presentation-only downgrade;
- structurally unrepresentable and import-blocking;
- separate diagram grammar/renderer, out of scope with a clear reason.

Include Mermaid flowchart grammar first. Audit D2 against the same matrix. For
non-flowchart Mermaid types, do not use a blanket “ELK renders graphs” argument:
identify which semantic models can be faithfully represented and phase any
separate grammar work.

## Spec ownership and branch discipline

Do not widen spec 075 into an interchange-parser spec. The warning surfaced
through the folder workflow, but parser breadth belongs to a follow-up to merged
spec 028. One active spec per feature branch remains mandatory.

Create a new worktree and branch from current `main`:

- worktree:
  `H:\WSL_dev_projects\diagram-generator-worktrees\080-renderable-interchange-import`
- branch: `feat/080-renderable-interchange-import`
- package: `specs/080-renderable-interchange-import/`

Before creating them, verify that spec/branch/worktree id 080 is still unused. If
080 has become occupied, use the next unused numeric id consistently and record
the substitution in the review.

In that new spec branch, create or update all of:

- `specs/080-renderable-interchange-import/spec.md`
- `specs/080-renderable-interchange-import/plan.md`
- `specs/080-renderable-interchange-import/tasks.md`
- `specs/080-renderable-interchange-import/validation.md`
- `specs/080-renderable-interchange-import/contracts/import-capability-matrix.md`
- `docs/specs.md`
- `TODO.md`
- `AGENT-INBOX.md`

Use the substituted id/path if 080 is unavailable.

The spec must:

- define “renderable” and “structural loss” normatively;
- make structurally lossy imports block before write;
- distinguish harmless visual downgrade warnings from semantic failures;
- specify engine-selection and persisted-engine behavior;
- enumerate parser/model/lowering/render/persistence prerequisites without
  assuming ELK options magically parse source syntax;
- prioritize the screenshot’s inline declarations and local direction failures;
- cover Mermaid broadly by capability, with a phased D2 parity plan;
- require representative real-world corpus fixtures plus focused minimal
  regressions;
- require topology, nesting, direction, styling, diagnostic, and YAML assertions;
- require browser-visible import diagnostics that name what was preserved,
  downgraded, and blocked;
- require `persist → reload` regressions for every changed preview import/write
  path;
- keep behavior-heavy ownership in TypeScript and respect the spec-046 ratchet;
- include bounded performance and malformed-input tests;
- include explicit non-goals for constructs that cannot be represented
  faithfully yet.

The task list must be implementation-ready, dependency ordered, test-first, and
small enough that a GPT implementer does not need to invent product semantics.
Every task needs an owner file/seam, expected behavior, and proof. Include a
phase gate after parser/IR work and before preview persistence integration.

Do not mark implementation tasks complete. This pass authors the plan; it does
not implement product code.

Do not alter the untracked screenshot. Do not commit unrelated files or fixture
reformats.

## Required durable review output

Do not leave the review in chat. Use file-editing tools and write the full review
to this exact path in the spec-075 worktree:

`docs/spec-reviews/opus-adversarial-review-findings-2026-07-18-renderable-interchange-import.md`

Create it even if some hypotheses are disproved. It must contain:

- verdict: current import safe / changes requested / import-blocking;
- findings ordered Critical → High → Medium → Low, each with a stable id, exact
  file/line evidence, reproduction, user impact, and remediation;
- the completed source-construct capability matrix or a precise pointer to the
  matrix created in the new spec package;
- spec 028 requirement/task mismatches and hidden scope assumptions;
- spec 075 integration implications without assigning parser ownership to 075;
- validation performed and missing evidence;
- the chosen new spec id, branch, worktree, and exact package paths;
- a concise summary of the new spec/tasks authored.

After the findings file and new spec package are written, reply in chat with only
two lines:

1. the findings-file path;
2. the new spec-package path.

Do not paste the review into chat.
