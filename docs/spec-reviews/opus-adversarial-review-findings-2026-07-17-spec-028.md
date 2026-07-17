# Opus adversarial review findings — Spec 028 diagram interchange

**Reviewer:** Opus (skeptical pre-merge maintainer)
**Branch:** `feat/028-diagram-interchange-mermaid-d2` reviewed against `main`
**Date:** 2026-07-17
**Scope:** Review only. No product code, tests, fixtures, bundles, diagrams, or
spec files were modified. Scratch inputs were written to the OS temp directory
only.

## Verdict: **Merge with follow-ups**

The export path and the *preview* import/export workflow are safe and
well-guarded. The preview import route refuses to overwrite an existing slug,
rejects empty imports, and re-compiles serialised YAML before writing – so the
primary product surface cannot persist invalid or empty canonical YAML.

The follow-ups are concentrated in the **CLI import path** and in **real-world
fidelity honesty**:

- **F2 (High)** is a genuine validation-bypass: the import CLIs emit invalid
  canonical YAML with exit 0 (even under `--strict`) whenever two frames share
  an id – including the very common case of a source node named `page`
  colliding with the synthetic wrapper. This directly contradicts FR-001
  ("import … does not bypass validation"). If the team treats the import CLIs
  as a shipped FR-006 deliverable, F2 should gate the merge rather than
  fast-follow.
- **F1 (Medium)** confirms the review's central suspicion: the importers really
  do only handle this repository's own exporter output. Hand-authored Mermaid
  and D2 that rely on implicit node creation or non-rectangular shapes import to
  an **empty** diagram, and the CLI reports success.

Everything else is Low/Informational hygiene.

## Validation commands run

- `npx vitest run tests/diagram-author-import.test.ts tests/diagram-author-export-d2.test.ts tests/app-save-client.test.ts` (in `packages/layout-engine`) → **30 passed**.
- `node --test --import tsx src/persistence/interchange-export.test.ts` (in `apps/preview`) → **3 passed**.
- Manual CLI runs of `import-mermaid.mjs` / `import-d2.mjs` against hand-authored
  scratch inputs, plus recompilation of emitted YAML through
  `compileDiagramYaml` (dist). Reproductions below.
- `git diff --stat main..HEAD` reviewed for scope; UI diff (`viewer-unified.html`,
  `editor.css`) inspected for architecture hygiene.
- **Not run:** the optional `D2_BIN` compile gate (no D2 binary configured – see
  F5), and a live browser preview session (import/export logic was exercised
  through its typed owners and node tests instead).

---

## Findings

### F2 — HIGH — Import CLIs emit invalid canonical YAML on duplicate ids, exit 0

**Evidence**

- `packages/layout-engine/src/diagram-author/import-result.ts`,
  `makeImportedDocument`: it calls `const indexed = buildFrameIndex(root);` but
  keeps only `indexed.frameIndex` and **discards `indexed.diagnostics`**.
  `buildFrameIndex` (`build-ast.ts`) is where `DUPLICATE_FRAME_ID` and
  `FRAME_MISSING_ID` (both `level: 'error'`) are produced, so those errors never
  reach the import result.
- `packages/layout-engine/scripts/import-mermaid.mjs` /
  `import-d2.mjs`: after import they call `serializeDiagramYaml(result.ast)` and
  write it directly. Unlike the preview route, **they never re-compile** the
  serialised YAML, so nothing else catches the duplicate.
- Contrast: `apps/preview/src/preview-host/frame-documents.ts`
  `importInterchangeForSlug` *does* re-compile (`compileDiagramYaml(yaml)`) and
  throws on errors – which is why the preview surface is safe and the CLI is not.

**Reproduction**

Author duplicate ids (a natural mistake, e.g. re-declaring a node):

```
flowchart TD
    A[Start]
    A[Restart]
```

```
node packages/layout-engine/scripts/import-mermaid.mjs --in dupe.mmd --strict
```

Output YAML contains two `- id: A` children; exit code is **0** and no
duplicate diagnostic is printed. Feeding that YAML back through
`compileDiagramYaml` yields:

```
[{"code":"DUPLICATE_FRAME_ID","level":"error","message":"Duplicate frame id: A","path":"root.children[1]"}]
```

**More likely trigger – the synthetic `page` wrapper.** `makeImportedDocument`
always names the root `page`. Any source with a top-level node literally named
`page` collides:

```
page: Home page
```

```
node packages/layout-engine/scripts/import-d2.mjs --in page.d2   # exit 0
```

emits:

```yaml
root:
  id: page
  children:
    - id: page          # ← duplicate of the wrapper
      label: [Home page]
      children: []
```

which recompiles to `DUPLICATE_FRAME_ID: page`.

**User-visible impact:** a CLI user gets a `.yaml` file that silently fails to
load the moment it is compiled/previewed, with no error at import time. Violates
FR-001 ("Import produces YAML … suitable for `compileDiagramYaml`; it does not
bypass validation").

**Smallest safe disposition:** surface `buildFrameIndex`'s diagnostics in the
`DiagramImportResult` (merge `indexed.diagnostics` into the import diagnostics in
`makeImportedDocument`), so duplicate/missing-id become import errors that the
CLI reports and `--strict`/error handling already gate. Alternatively, mirror
the preview and re-compile the serialised YAML in the CLIs before writing. Also
consider namespacing the synthetic wrapper id (or detecting a real `page` node)
so it cannot collide.

---

### F1 — MEDIUM — Real hand-authored Mermaid/D2 imports to an empty diagram; CLI reports success

**Evidence & reproduction**

Minimal, idiomatic Mermaid that relies on implicit node creation:

```
graph TD
    A --> B
    B --> C
```

```
node packages/layout-engine/scripts/import-mermaid.mjs --in implicit.mmd   # exit 0
```

produces an **empty** diagram:

```yaml
root:
  id: page
  direction: vertical
  children: []
arrows: []
```

with only `IMPORT_MERMAID_MISSING_FRAME_REF` warnings. The identical failure
occurs for D2 implicit shapes (`a -> b\nb -> c` → empty, only
`IMPORT_D2_MISSING_FRAME_REF`). Common non-rectangular Mermaid shapes are also
rejected:

```
A(Start)      → IMPORT_MERMAID_UNSUPPORTED_SYNTAX
B{Decision}   → IMPORT_MERMAID_UNSUPPORTED_SYNTAX
C((End))      → IMPORT_MERMAID_UNSUPPORTED_SYNTAX
```

`import-mermaid.ts`/`import-d2.ts` only create frames from explicit node/shape
declarations (`id["label"]`, `id: { … }`, `id: label`); edges never
materialise their endpoints. That set is exactly what the repo's own exporter
emits, which is why every passing test works and every hand-authored idiom
above does not.

**Scope note (fair to the authors):** FR-003/FR-004 do scope the import subset
narrowly (nodes `id["label"]`, edges `a --> b`), so the *shape* restrictions are
documented behaviour, and each unsupported construct is diagnosed (not silent).
The findings within that scope are:

1. **Misleading diagnostic.** An implicit-node diagram reports
   `MISSING_FRAME_REF` ("edge references a node that was not imported"), which
   points the user at the edge rather than telling them implicit nodes are
   unsupported / to declare nodes explicitly.
2. **CLI vs preview parity gap.** When *zero* nodes import, the preview throws
   `No diagram nodes could be imported`, but the CLI writes an empty
   `children: []` YAML and exits 0 – a silent total-loss "success".
3. **Contract omission.** The "Known import limitations (v1)" table in
   `contracts/interchange-fidelity.md` documents chained edges and D2 class-only
   blocks but does **not** mention the implicit-node dependency or the
   rectangle-only node-shape restriction, which are the limitations users hit
   first.

**Disposition:** (a) give the CLI the same empty-import guard as the preview
(non-zero exit + clear message); (b) reword `MISSING_FRAME_REF` when the
endpoint id was never declared to name implicit-node/shape support explicitly;
(c) add the implicit-node and node-shape restrictions to the v1 limitations
table. Broadening the parser is optional and out of the documented v1 scope.

---

### F3 — LOW/MEDIUM — D2 chained connections are an undocumented limitation

**Evidence:** `import-d2.ts` edge regex `^(.+?)\s*->\s*([A-Za-z_][\w.-]*)…$`
matches a single arrow. For `Start -> Middle -> End` the lazy source
backtracks to `Start -> Middle` and the whole thing resolves to a single
missing-ref:

```
[IMPORT_D2_MISSING_FRAME_REF] D2 connection references a shape that was not imported: Start -> Middle -> End
```

`Middle`/`End` never materialise. The v1 limitations table documents **Mermaid**
chained edges (`a --> b --> c`) but says nothing about the equivalent **D2**
construct.

**Disposition:** add a D2 chained-connection row to the limitations table, and
ideally emit a dedicated `IMPORT_D2_UNSUPPORTED_EDGE`-style diagnostic instead of
a generic missing-ref that misreports the id.

---

### F4 — LOW — "Copy overrides" removed from the Document panel; supporting code orphaned

**Evidence:** `scripts/preview/viewer-unified.html` replaced the old Document
button row. The `btn-export` ("Copy overrides"), `btn-save-svg`, and
`btn-save-drawio` buttons were removed in favour of a single export-format
selector. However:

- `packages/layout-engine/src/preview-shell/app-shell-panels.ts`
  (`syncPreviewDocumentActionControls`, `initPreviewOverrideToolbar`) and
  `app-bootstrap.ts` (`getElementById('btn-export')`) still fully wire the
  copy-overrides feature. With the button gone, `options.exportButton` is null
  and the feature is silently unavailable while its state
  (`disableCopyOverrides`/`showCopyOverrides`) and handler become dead code.
- `app-save-client.ts` still adds click listeners to `btn-save-svg` /
  `btn-save-drawio` (lines ~656–659); these bind to removed elements and are
  no-ops. SVG/draw.io export itself is preserved through the new export selector
  (`exportCurrentFormat` → `saveCurrentSvg`/`saveCurrentDrawio`), so there is no
  functional loss for those two.

**Impact:** the clipboard "Copy overrides" affordance disappears from the UI
with no mention in FR-007 (which only covers Save + Export + Import). Either an
intended consolidation that should be documented, or an unrelated regression
that should be split out.

**Disposition:** confirm intent. If intentional, remove the now-dead
copy-overrides wiring and note the removal in the spec. If not, restore the
control. Either way, drop the dead `btn-save-svg`/`btn-save-drawio` listeners.

---

### F5 — LOW — Optional D2 compile gate is skip-when-unset (opt-in false green)

**Evidence:** `packages/layout-engine/tests/diagram-author-export-d2.test.ts`
"optionally compiles exported D2 when D2_BIN is configured" returns early when
`process.env.D2_BIN` is unset. In default CI (no `D2_BIN`) it passes trivially,
so the claim "exported D2 is syntactically valid against a real D2 compiler" has
no default coverage.

**Disposition:** acceptable as an opt-in gate, but document that D2 syntactic
validity is unverified unless `D2_BIN` is set, and consider running it in a CI
lane that installs D2. Do not treat a green suite as evidence that exported D2
compiles.

---

### F6 — INFO — Tests cover real-world *shapes* but never implicit nodes or duplicate ids

`diagram-author-import.test.ts` does test frontmatter, `:::class` suffixes,
labelled subgraphs, alternate `-- "x" -->` edges, D2 nested blocks, and D2
class-only blocks – genuinely more than exporter symmetry. But **every** case
declares its nodes explicitly, and there is no test for implicit-node input or
duplicate ids – precisely the F1/F2 gaps. `interchange-roundtrip.mjs` and the
two `round-trips …exporter structure` tests assert exporter→importer symmetry,
which is the shape the review request explicitly cautioned against relying on.

**Disposition:** add regression tests for (a) implicit-node Mermaid/D2 (assert
the diagnostic/empty-guard behaviour once F1 is settled) and (b) duplicate-id
input surfacing an import error (F2).

---

### F7 — INFO — Prior review artifact committed into the feature branch

`docs/spec-reviews/028-diagram-interchange-mermaid-d2-opus-review.md` (an
earlier Opus review with BLOCKER B1 `:::class` suffix and B2 D2 singular
`class:`) is committed on this branch. Both B1 and B2 appear **remediated**
(`stripMermaidClassSuffix` in `import-mermaid.ts`; the `class`/`classes` guard in
`import-d2.ts`), and the file is not being presented as the current review. Flag
only as hygiene: decide whether prior-review documents belong in the product
feature branch, and do not conflate that artifact with these current findings.

---

## Areas checked that are sound (no finding)

- **Path containment / slug validation.** Import and export routes validate
  `slug` with `/^[A-Za-z0-9._:-]+$/`
  (`builtin-autolayout-host.ts` `createPreviewInterchangeImportHostApiRoute` and
  `resolveInterchangeExportSlug`). Separators (`/`, `\`) are rejected, so
  `path.join(framesDir, slug + '.yaml')` cannot escape `framesDir` (verified:
  `..`, `C:evil`, `foo:bar`, `a..b` all stay under the frames directory; the one
  input that escaped contained a backslash and is rejected by the regex before
  it reaches `path.join`). The client mirrors the same regex in
  `importCurrentFile`.
- **Import-as-new persistence.** `importInterchangeForSlug` refuses to overwrite
  an existing slug (`existsSync` → throw), rejects an empty import
  (`root.children.length === 0` → throw), and re-compiles the serialised YAML
  before writing – so a failed or empty import cannot overwrite a file or leave
  a partially written diagram. Confirmed by the `interchange-export.test.ts`
  "refuses overwrite" case.
- **Export does not persist or dirty.** Export routes are GET, read YAML from
  disk, cache by `(format, mtime)` (`renderInterchangeExportForSlug`), and never
  write. The client export path (`saveCurrentInterchange`,
  `exportCurrentFormat`) only downloads and does not touch dirty state or
  override payloads.
- **Architecture hygiene.** New behaviour lives in TypeScript owners
  (`diagram-author/*`, `preview-host/*`, `preview-shell/app-save-client.ts`).
  The `scripts/preview` changes are markup/CSS only (`viewer-unified.html`,
  `editor.css`) – no new behaviour-heavy JS, consistent with the spec-046
  ratchet. No duplicate parser/persistence authority was introduced.
- **HTTP status/content types.** Import returns `201` with JSON; invalid slug →
  `400 "Invalid import slug"`; import errors → `400` with the diagnostic text.
  Export downloads use the documented `.mmd`/`.d2` filenames.

## Follow-up summary

| ID | Severity | Follow-up |
|----|----------|-----------|
| F2 | High | Surface `buildFrameIndex` diagnostics in import result (or re-compile in CLIs); avoid `page` wrapper id collision. |
| F1 | Medium | CLI empty-import guard + clearer diagnostic + document implicit-node / node-shape limits. |
| F3 | Low/Med | Document (and ideally diagnose) D2 chained connections. |
| F4 | Low | Confirm/clean up "Copy overrides" removal and dead save-svg/drawio listeners. |
| F5 | Low | Document that D2 syntactic validity is unverified without `D2_BIN`. |
| F6 | Info | Add implicit-node and duplicate-id regression tests. |
| F7 | Info | Decide whether prior review docs belong on the feature branch. |

---

# Re-review of remediation — commit `228adde` (2026-07-17, later same day)

**Scope of this pass:** independently verify commit
`228adde feat(interchange): support hand-authored Mermaid flowcharts` against the
2026-07-17 Mermaid-first spec revision (FR-004 rewrite, FR-008/009/010) and the
findings above. I did not take the implementer's summary at face value — every
claim below was reproduced from source, the CLI, or a test run. Scratch inputs
were written to the OS temp directory only; no product files were changed by this
re-review other than appending this section.

## Verdict: **Merge ready** (one documented limitation noted as optional polish)

The two findings that mattered — **F1** (real hand-authored Mermaid imported to
empty diagrams) and **F2** (CLIs emitting invalid YAML with exit 0) — are
genuinely fixed at the shared layer, verified end to end. The remediation is
honest: `validation.md` and the fidelity matrix disclose exactly what is and is
not supported, including the residual limitation I re-confirmed below.

## What I verified (reproduced, not trusted)

**F1 / FR-004 hand-authored coverage — fixed.** Ran the Mermaid CLI on
hand-authored inputs the exporter never produces:

- Implicit nodes: `graph TD\n A --> B\n B --> C` → three frames + two arrows,
  exit 0 (previously empty + `MISSING_FRAME_REF`, exit 0).
- Chained edges with labels: `a -->|x| b --> c -->|y| d` → four frames, three
  arrows, labels on the right segments.
- Bidirectional / alternate links: `<-->`, `---`, `==>`, `-.->` all import one
  directed arrow each with `IMPORT_MERMAID_UNSUPPORTED_EDGE_DIRECTION` /
  `_EDGE_STYLE` warnings — connectivity preserved, not dropped.
- All standard node shapes (`(round)`, `{diamond}`, `((circle))`, `([stadium])`,
  `[[subroutine]]`, `[(cylinder)]`, `{{hexagon}}`, `>flag]`) import as labelled
  frames with one `IMPORT_MERMAID_UNSUPPORTED_SHAPE` each.
- Large `config`/`themeVariables`/`themeCSS` frontmatter, `%%` comments, nested
  labelled subgraphs, and `:::class` suffixes all handled (covered by the new
  "keeps comments, large frontmatter, nested subgraphs…" test).

**F2 / FR-009 no invalid or empty YAML — fixed.** `import-result.ts`
`makeImportedDocument` now returns `buildFrameIndex` diagnostics (previously
discarded); `finishImport` surfaces them. Reproduced:

- Duplicate ids (`A["Start"]` / `A["Restart"]`) → `DUPLICATE_FRAME_ID` error,
  CLI exit 1 (previously invalid YAML, exit 0).
- The `page` wrapper collision is gone: the synthetic root renames to `page_root`
  when an imported node is named `page`; output compiles with zero errors.
- Empty import → `No diagram nodes could be imported.`, exit 1.
- Both `import-mermaid.mjs` and `import-d2.mjs` re-compile the serialised YAML
  and fail before writing — the same safety net the preview route already had.

**F4 — fixed cleanly.** `#btn-export` ("Copy overrides") is restored in
`viewer-unified.html`, and the previously-orphaned `syncSaveSvgButton` /
`syncSaveDrawioButton` helpers, their calls, the `btn-save-svg` / `btn-save-drawio`
listeners, and the interface members were all removed. Grepped the whole
workspace: **no dangling references** to the removed methods.

**FR-008 diagram-type guard — implemented.** Non-flowchart Mermaid is rejected
before statement parsing with exactly one `IMPORT_MERMAID_UNSUPPORTED_DIAGRAM_TYPE`
error naming the type. Reproduced against real corpus files: `sankey-beta`,
`pie`, `sequenceDiagram`, plus an unknown token (`futureDiagram`) — each one
error, zero phantom frames, exit 1.

**FR-010 corpus examples — present and valid.** All three exist in
`diagrams/1.input/` and compile with **0 errors** (independently recompiled):
`mermaid-support-flowchart.yaml`, `mermaid-mongo-octavia-ha.yaml`,
`mermaid-lifecycle-details.yaml`.

**F6 tests — genuinely hand-authored.** The import suite grew 7 → 15 tests with
assertions for implicit nodes, chained edges, bidirectional/alternate downgrades
under `--strict`, eight node shapes, the type guard, duplicate ids, and the
`page_root` collision — not exporter symmetry. My targeted runs:
`diagram-author-import` (15), `diagram-author-import-cli` (4), `app-save-client`
(14) → **33 passed**.

**F7 — handled.** My original findings above are byte-for-byte intact (untampered);
the earlier `028-...-opus-review.md` artifact carries a "superseded" banner.

**Deliberate semantic change (acceptable).** Under `--strict`, accepted lossy
constructs (`UNSUPPORTED_STYLE/SHAPE/EDGE_DIRECTION/EDGE_STYLE`) now stay warnings
instead of failing, while genuine unsupported syntax still errors. This matches
the FR-004 "diagnose + drop" contract and is covered by an updated test. Worth a
line in release notes since it changes the old strict-on-`classDef` behaviour.

## Residual limitation (documented; optional polish)

- **Inline node declarations on an edge** — `A[Start] --> B[Done]` (label +
  shape declared inline on the edge, no separate node line) is **not** parsed:
  it emits `IMPORT_MERMAID_UNSUPPORTED_EDGE` and, if it is the only content,
  fails the whole import ("No diagram nodes could be imported", exit 1). This is
  a very common hand-authored idiom. It is **honestly documented** in the
  fidelity matrix's "Known import limitations" table with recovery guidance
  (declare nodes separately, then use a chain), so it is a scoped limitation, not
  a defect. Optional future polish: parse inline endpoint declarations, or echo
  the "declare nodes separately" hint in the CLI/preview error text so a user
  who pastes such a snippet isn't left with a bare "unsupported edge" message.

## What I did not independently run

- The full `npm --prefix packages/layout-engine test` (claimed 1,050) and
  `apps/preview test` (claimed 173) — I re-ran the import/CLI/save-client suites
  (33 passed) and independently recompiled the three corpus outputs instead.
- The `D2_BIN` real-compiler gate — no D2 binary is installed in this
  environment. The validation log records it passing with a local D2 install;
  this remains opt-in (original F5) and unverified here.

## Disposition

Original F1, F2, F4, F6, F7 closed and verified. F3/F5 remain honestly deferred
and documented. No new blocking issues. Recommend merge; consider the inline-edge
idiom and the CLI error-message hint as a small follow-up.
