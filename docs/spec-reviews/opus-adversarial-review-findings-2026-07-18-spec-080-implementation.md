# Opus adversarial review findings — spec 080 implementation

**Date**: 2026-07-18
**Reviewer role**: Opus adversarial implementation review (no product code changed)
**Review request**: [`opus-adversarial-review-request-2026-07-18-spec-080-implementation.md`](opus-adversarial-review-request-2026-07-18-spec-080-implementation.md)
**Reviewed branch**: `feat/080-renderable-interchange-import`
**Worktree**: `H:\WSL_dev_projects\diagram-generator-worktrees\080-renderable-interchange-import`

## Branch / worktree / merge-base verification

- current branch = `feat/080-renderable-interchange-import` ✔
- HEAD = `4e0a032` ✔
- dependency boundary `f0f440f` ("fix(075): surface opened folder navigation") is an ancestor of HEAD ✔
- merge-base with `main` = `88aec7c` ("ci: add generator validation baseline"), which is current `main` HEAD (main is fully merged into this branch's base) ✔
- spec-080 delta reviewed as `git diff f0f440f...HEAD` (50 files, +5051/-496).

The spec-075 dependency was replayed onto current `main`; I reviewed the 080
delta against `f0f440f`, not the old `feat/075` branch name. **No accidental
unrelated change or ownership regression found** in the delta: it touches only
the importer, the canonical `flowDirection` model plumbing, the shared gate, the
preview import route/UI, the CLIs, the spec-080 package, and the expected catalog
/ docs files (`AGENT-INBOX.md`, `TODO.md`, `docs/specs.md`,
`docs/diagram-authoring.md`). The spec-046 TypeScript ratchet holds (no new
behaviour-heavy JS under `scripts/preview/`) and the no-new-Python ratchet passes.

## Verdict

**CHANGES REQUESTED.**

The two Critical and the High/Medium/Low defects from the original review are all
**genuinely resolved** (see the F-C1…F-L2 table). The core safety contract now
holds under adversarial probing: I could not produce a single import that writes
a structurally lossy diagram or reports success after dropping topology,
containment, endpoint, direction, or multiplicity. Every loss I could construct
either blocks the write (in all modes, through every entry point) or is a named
visual downgrade. The gate is data-driven on `Diagnostic.category`, not duplicated
string lists.

However, the implementation is **narrower than the capability matrix claims**, and
that overclaim is exactly the "optimistic classification / test citation that does
not prove the row" that review point 10 asks to falsify. Three common, fully
representable constructs are **false-blocked** while the matrix classifies them as
supported (`S`):

1. Unquoted edge labels `a -- yes --> b` — the dominant hand-authored decision-flow
   form — block the whole import (**High**, C-adjacent to the spec's stated
   mission of hand-authored breadth). Matrix row MF-09 only proves the quoted /
   pipe forms.
2. Direction-less headers `flowchart` / `graph` (valid Mermaid, defaults top-down)
   block as `UNSUPPORTED_DIRECTION` (**Medium**). MF-01 never covers them.
3. D2 connections with implicit endpoints `a -> b` block as `MISSING_FRAME_REF`
   (**Medium**). D2 auto-creates shapes from connections; the importer requires
   pre-declared shapes, so the most basic hand-authored D2 blocks. Rows D2-03 /
   D2-06 cite tests that pre-declare every endpoint and therefore do not prove the
   implicit-endpoint case.

These are **safe** (nothing wrong is written) but they are truthfulness defects in
the normative capability matrix and usability regressions against the spec's
explicit "faithful breadth" mission. The matrix and spec must be corrected and the
representable gaps closed (they are class-`P`, representable now). No `IMPORT-BLOCKING`
verdict is warranted because no unsafe write is possible.

---

## F-C1…F-L2 resolution table

| Finding | Original defect | Status | Evidence (verified this pass) |
|---------|-----------------|--------|-------------------------------|
| **F-C1** | Structural loss surfaced as non-blocking warning; lossy diagram written & reported as success | **Resolved** | `finishImport` upgrades any `structural`/`invalid`/`type` diagnostic to `error` regardless of strict ([import-result.ts](../../packages/layout-engine/src/diagram-author/import-result.ts#L84-L128)). Preview route throws `InterchangeImportBlockedError` and writes nothing; host returns HTTP 422 with the structured summary ([builtin-autolayout-host.ts](../../apps/preview/src/preview-host/builtin-autolayout-host.ts#L182-L189)); UI shows `Import blocked`, sets `error` status, does not navigate ([app-save-client.ts](../../packages/layout-engine/src/preview-shell/app-save-client.ts#L525-L556)). Confirmed by repro and by `interchange-export.test.ts` "blocks structural Mermaid loss before writing". |
| **F-C2** | Inline-declared edges dropped wholesale | **Resolved** | `a["A"]:::x --> b["B"]:::y` imports two frames + one arrow + two `visual` class downgrades, not blocked (my repro). Tokenizer/IR path parses inline declarations on either endpoint. |
| **F-C3** | Subgraph-local `direction` dropped | **Resolved** | `direction LR` inside a subgraph sets the container `direction: horizontal` + `flow_direction: LR` ([parse-flowchart.ts](../../packages/layout-engine/src/diagram-author/mermaid/parse-flowchart.ts#L497-L515), [lower-flowchart.ts](../../packages/layout-engine/src/diagram-author/mermaid/lower-flowchart.ts#L52-L67)). Repro confirmed. |
| **F-H1** | `RL`/`BT` silently collapsed | **Resolved** | Canonical `flowDirection: 'TB'\|'LR'\|'BT'\|'RL'` added across `types.ts`, `frame-model.ts`, parser/record-parser/serializer/lowering. `graph RL`/`graph BT` preserve `flow_direction` and select `elk-layered`; ELK maps `RL→LEFT`, `BT→UP` ([elk-algorithm-options.ts](../../packages/graph-layout-elk/src/elk-algorithm-options.ts#L17-L22)). Repro confirmed. |
| **F-H2** | CLI and preview applied different gates | **Resolved** | Both share `finishImport`. Mermaid & D2 CLIs surface the category and exit non-zero on structural loss, writing nothing (`diagram-author-import-cli.test.ts`, 6/6 pass). |
| **F-H3** | class/style always discarded | **Resolved (bounded)** | `fill` (white/black/grey) and `border` (solid/dashed/none) map faithfully; other props are named `visual` downgrades ([lower-flowchart.ts](../../packages/layout-engine/src/diagram-author/mermaid/lower-flowchart.ts#L190-L233)). Arbitrary colours downgrade by design (FR-006). |
| **F-M1** | Multi-target / chained-inline deferred | **Resolved** | `a --> b & c`, `a & b --> c`, and `a[A] --> b[B] --> c[C]` all expand to the full arrow set (repro). |
| **F-M2** | D2 exporter-only, non-blocking loss | **Resolved (gate) / gap remains** | D2 now routes through the shared gate; `IMPORT_D2_MISSING_FRAME_REF` is `structural` and blocks (`d2-parity.test.ts`). New gap: implicit endpoints block (see M-2 below). |
| **F-M3** | Regex-per-line dispatch | **Resolved (Mermaid)** | Mermaid is now `tokenize → parse → IR → lower` (`mermaid/tokenize.ts`, `parse-flowchart.ts`, `lower-flowchart.ts`). D2 remains line-oriented, which the spec permits for the phased D2 pass. |
| **F-M4** | No structured summary | **Resolved** | `ImportSummary { preserved, downgraded, blocked }` returned and rendered as `N preserved, N downgraded, N blocked`. |
| **F-L1** | Engine always v3 | **Resolved** | `selectImportEngine` reads `ELK_LAYERED_GRAPH_LAYOUT_ENGINE.capabilities`; flat/tree → `v3`, reverse/cross-container/cycle/fan-in → `elk-layered`, unrenderable → block. Persisted as `meta.layout_engine`, resolved on reload to `frameDiagram.layoutEngine` (`interchange-export.test.ts`, `local-folder-workspace.test.ts`). |
| **F-L2** | Bounded/malformed coverage thin | **Resolved** | `mermaid-robustness.test.ts`: independent line/node/edge/depth bounds, unterminated subgraph blocks, HTML label reduced to inert text (YAML has no `<script`/`onerror`/`<img`), 1,000-edge import < 2 s. |

**All twelve original findings are resolved.** The findings below are newly
surfaced by this pass; none is a regression of an original finding.

---

## Findings (Critical → High → Medium → Low)

### Critical

None. No import path can write a structurally lossy diagram or report success
after graph-meaning loss.

### High

#### N-H1 — Unquoted labelled edges (`a -- Yes --> b`) block the whole import

**Evidence.** [parse-flowchart.ts](../../packages/layout-engine/src/diagram-author/mermaid/parse-flowchart.ts#L323-L343) only recognises an edge label when the token after `--` is a **quoted string** (`a -- "x" -->`) or when a `|...|` pipe label follows a real connector. `connectorValue('--')` returns `null` (bare `--` is not in the accepted connector set), so for `a -- Yes --> b` the tokens are `id(a) connector(--) identifier(Yes) connector(-->) id(b)`; the special case fails because `Yes` is an `identifier`, not a `string`, and `parseEdgeStatement` returns `null`. The statement then falls through to `unsupported: 'syntax'` → `IMPORT_MERMAID_UNSUPPORTED_SYNTAX` (`structural`, blocking) in [lower-flowchart.ts](../../packages/layout-engine/src/diagram-author/mermaid/lower-flowchart.ts#L383-L403).

**Reproduction.**
```
flowchart TB
a -- Yes --> b
```
→ `errors: [structural:IMPORT_MERMAID_UNSUPPORTED_SYNTAX]`, nothing imported, whole write blocked. `a -- click me --> b` behaves identically. The quoted form `a -- "Yes" --> b` and the pipe form `a -->|Yes| b` both import correctly.

**User impact.** `A -- Yes --> B` / `A -- No --> B` is one of the two canonical
Mermaid decision-edge forms and appears throughout hand-authored flowcharts (the
exact "style GitHub renders" the spec targets). A single such edge blocks the
entire import of an otherwise-valid diagram with the confusing message "statement
is outside the supported flowchart subset". This is squarely against the spec's
mission ("import every construct whose graph meaning can be lowered … faithful
breadth") and against success criterion 1.

**Matrix truthfulness.** Row **MF-09** ("Labelled edge", class `S`, examples
`a -->|x| b`, `a -- "x" --> b`) is cited as supported, but its proof only covers
the quoted / pipe forms. The unquoted `-- text -->` form is not proven and does
not work.

**Remediation.** The unquoted label is representable now (class `P`): the parser
should treat the tokens between a `--`/`==`/`-.` opener and the following arrow as
the edge label. See task **T070**. Split MF-09 in the matrix so the unquoted form
is a tracked `P` row until the parser lands, not an unqualified `S`.

### Medium

#### N-M1 — Direction-less `flowchart` / `graph` headers block

**Evidence.** [parse-flowchart.ts](../../packages/layout-engine/src/diagram-author/mermaid/parse-flowchart.ts#L438-L456) requires `isDirection(directionToken) && statement.tokens.length === 2` on the header. A bare `flowchart` (or `graph`) has a one-token header, fails the check, and returns `IMPORT_MERMAID_UNSUPPORTED_DIRECTION` (`structural`, blocking).

**Reproduction.**
```
flowchart
a --> b
```
→ `errors: [structural:IMPORT_MERMAID_UNSUPPORTED_DIRECTION]`, nothing imported.

**User impact.** `flowchart` / `graph` without a direction is valid Mermaid and
defaults to top-down; such diagrams are common. Blocking them is a false block of
a trivially renderable construct, and the message ("direction is outside the
supported flowchart subset") is misleading because there is no direction to reject.

**Matrix truthfulness.** Row **MF-01** only lists `flowchart TB` / `graph TD`; the
direction-less header is uncovered.

**Remediation.** Default a missing header direction to `TB` (task **T071**); add an
MF-01 sub-row and a proof.

#### N-M2 — D2 connections with implicit endpoints block (asymmetry with Mermaid)

**Evidence.** [import-d2.ts](../../packages/layout-engine/src/diagram-author/import-d2.ts#L387-L403) resolves every connection endpoint against `pathMap`, which contains only **declared** shapes/containers; an unresolved endpoint emits `IMPORT_D2_MISSING_FRAME_REF` (`structural`, blocking). D2 does not create implicit shapes from connections, whereas Mermaid does (MF-07, verified).

**Reproduction.**
```
a -> b -> c
```
→ `errors: [structural:IMPORT_D2_MISSING_FRAME_REF]`, nothing imported. The
`d2-parity.test.ts` chained-connection proof pre-declares `a`, `b`, `c`, so it
never exercises the implicit-endpoint case.

**User impact.** Implicit shape creation from connections is the most basic and
common hand-authored D2. Requiring pre-declaration blocks ordinary D2 while
Mermaid's identical pattern (`a --> b` with undeclared nodes) succeeds — the exact
"accidental single-format-only semantics" review point 7 asks to catch, here
inverted (Mermaid-only implicit endpoints).

**Matrix truthfulness.** Rows **D2-03** (`a -> b`, `S`) and **D2-06** (`a -> b -> c`,
`S`) claim connections are supported without noting the pre-declaration
requirement; their cited proofs pre-declare endpoints.

**Remediation.** Either create implicit D2 frames from connection endpoints (task
**T072**, matching MF-07) or reclassify D2-03/D2-06 to `P` and annotate the
pre-declaration requirement. Given D2 is explicitly phased (US-6, P3), reclassify
now and schedule the implicit-endpoint task.

### Low

#### N-L1 — Conflicting inline labels for one id are silently reduced to the last

**Evidence.** [lower-flowchart.ts](../../packages/layout-engine/src/diagram-author/mermaid/lower-flowchart.ts#L70-L103) `collectNodes` only raises `DUPLICATE_FRAME_ID` for two **standalone** explicit declarations (declarations on a line with no edge). Two inline declarations of the same id on different edge lines are both "on an edge line", so no duplicate is flagged; `preferredNodeOccurrence` keeps `explicit.at(-1)` and the earlier label is dropped with **no diagnostic**.

**Reproduction.**
```
flowchart TB
a["First"] --> b
a["Second"] --> c
```
→ node `a` keeps label "Second"; "First" is dropped silently, no warning.

**User impact.** Minor. Label text is not in the spec's structural-loss set
(topology/containment/endpoint/direction/multiplicity), so this is content loss,
not structural loss, and it does not violate the no-silent-*structural*-loss
guarantee. Still, a silent label drop is surprising. A `visual` (or `invalid`)
diagnostic naming the conflicting labels would close it. Task **T073**.

#### N-L2 — `o--o` / `x--x` edge decorations block and are uncatalogued

**Evidence.** These circle/cross endpoint decorations are not in the tokenizer's
`CONNECTORS` set, so `a o--o b` tokenizes oddly and falls to
`IMPORT_MERMAID_UNSUPPORTED_SYNTAX` (`structural`, block). Repro confirmed. They
are not listed anywhere in the matrix.

**User impact.** Low; these are uncommon. Blocking is safe. They should still be
catalogued (as `V` — decoration dropped to a plain directed arrow — or `B` with a
reason) so the matrix is complete. Task **T074**.

#### N-L3 — Corpus-fixture SHA-256 provenance is a comment, not re-verified

**Evidence.** The three fixtures carry `# Source SHA-256: …` provenance headers
(e.g. [imported-riscv-boot-flow.yaml](../../diagrams/1.input/imported-riscv-boot-flow.yaml#L1-L2)) and `imported-corpus-fixtures.test.ts` asserts compile-clean, minimum frame/arrow
counts, and `elk-layered`. But no in-repo test recomputes the SHA against the
source `.mmd` or re-runs the importer to prove the fixture *was* importer-generated
(the source corpus lives outside the repo, read-only). The "generated by the
importer, verifiable provenance" claim is therefore asserted, not proven in CI.

**User impact.** Low. The min-topology thresholds already stop the tests passing
on empty/flattened output. Residual risk only if a fixture is hand-edited to
diverge from what the importer would emit. Task **T075** (optional): a checked-in
`.mmd` copy + a regenerate-and-diff test, or drop the "verifiable" wording.

---

## Capability-matrix and spec/task truthfulness audit

- **MF-09 (labelled edge, `S`)** — overclaimed. Only quoted `-- "x" -->` and pipe
  `-->|x|` are proven; unquoted `-- text -->` blocks (N-H1). Must split into a
  proven `S` sub-row and a `P` sub-row.
- **MF-01 (header + vertical, `S`)** — incomplete. Direction-less `flowchart`/`graph`
  blocks (N-M1). Add a covered sub-row.
- **D2-03 / D2-06 (`S`)** — overclaimed. Cited proofs pre-declare endpoints;
  implicit-endpoint connections block (N-M2).
- **MF-11 / MF-12 (bidirectional / link styles, `V`)** — accurate; verified as
  named `visual` downgrades.
- **MF-16–20, MF-26, MF-27, MF-31–34** — accurate; verified by repro (inline decls,
  fan-out/fan-in, self-loop, parallel edges, cycle, disconnected, semicolons).
- **MF-03 / MF-20 reverse + engine** — accurate; `flow_direction` persists and
  `elk-layered` is selected and resolved on reload.
- **Engine-selection decision table** — accurate but note `hasHighFanIn` treats any
  in-degree ≥ 2 as "high fan-in", so most non-trivial DAGs (any merge node) select
  `elk-layered` rather than `v3`. This matches the table row "high fan-in / dense
  graph" and is safe, but "flat compatible DAGs use v3" holds only for strict
  trees. Not a defect; documented here so the classification is not read as more
  selective than it is.
- **Diagnostic-category contract** — accurate and enforced strict-independently.
- **spec.md success criteria 1** ("the screenshot's two failures are fixed") — the
  inline-edge and subgraph-direction failures are fixed, but the same screenshot
  style routinely also contains `-- Yes -->` decision edges (N-H1), so a real
  screenshot-shaped paste can still hard-block. The spec should acknowledge the
  unquoted-label gap until T070 lands.

No false `[x]` checkboxes were found: each checked task maps to a passing test.
The truthfulness gap is in the **matrix classifications** (rows asserted `S` whose
proofs cover a narrower form), not in the task ledger.

---

## Validation performed

All commands run on Windows in this worktree at HEAD `4e0a032`:

| Command | Result |
|---------|--------|
| `npm --prefix packages/layout-engine test` | **179 files / 1118 tests passed** |
| `npm --prefix apps/preview test` | **191 tests: 190 passed / 1 skipped (expected Windows symlink) / 0 failed** |
| `npm --prefix packages/layout-engine run build:browser` | ok |
| `node scripts/check-browser-bundle-fresh.mjs` | fresh (exit 0) |
| `node scripts/check_no_new_python.mjs` | ok, 9 files, no new product-path (exit 0) |
| `npm run clean:src-artifacts` | ok |
| `git diff --check` | clean (exit 0) |

Focused adversarial reproductions (throwaway test, since removed) exercised: inline
declarations ± class, chained inline, fan-out/fan-in, flat/reverse directions,
self-loop, parallel edges, cross-container edges, diamond fan-in, subgraph-local
direction, adversarial HTML labels, thick/dotted links, unquoted/quoted/pipe edge
labels, direction-less headers, conflicting inline labels, `o--o` edges, and D2
chained/implicit/direction/malformed cases. Findings above are the results.

### Missing evidence / not independently reproduced

- No runtime **render** of the persisted `elk-layered` diagrams was executed; I
  verified the persisted `meta.layout_engine` resolves to `frameDiagram.layoutEngine`
  and that ELK maps reverse to `LEFT`/`UP`, but not the final pixels.
- SHA-256 provenance not re-verified (N-L3; source corpus is external/read-only).

---

## Residual risks and merge recommendation

**Safety:** high confidence. The no-silent-structural-loss and no-false-success
guarantees hold under adversarial probing across all four entry points (preview
server root, local-folder mirror, Mermaid CLI, D2 CLI), in strict and non-strict
mode. HTTP failures retain the structured summary; the UI never navigates after a
block.

**Fidelity / truthfulness:** the matrix overclaims three rows and three common,
representable constructs false-block. These do not corrupt data but they defeat the
spec's "faithful breadth" mission and make the normative matrix inaccurate.

**Recommendation:** **Do not merge as "matrix-complete" until N-H1, N-M1, N-M2 are
either fixed or reclassified.** The safe-blocking behaviour means the branch is not
dangerous, so a maintainer may choose to merge the safety work and track N-H1/M1/M2
as fast-follows — but the capability matrix and spec success-criterion 1 must be
corrected in the same change so the documented contract stops overclaiming. I have
updated the matrix and spec to reflect reality and added unchecked remediation
tasks T070–T075 (owner seams + named proofs) to `tasks.md`. No product code was
changed in this review.
