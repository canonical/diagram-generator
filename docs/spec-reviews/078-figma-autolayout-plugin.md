# Adversarial review — Spec 078 Figma autolayout plugin (2026-07-09)

---

## RE-REVIEW ROUND 3 (2026-07-10) — DECISIVE: the importer never reads the engine's *effective* sizing; it re-emits raw authored values the engine itself overrides

> Triggered by the user's question: "does the code actually read the current
> values from our YAML/engine, or simply fake it — because fill-under-hug does
> not work in our own autolayout either." **Answer: the importer reads the RAW
> authored sizing and discards the engine's coercion. Fill-under-hug is illegal
> in our engine too — the engine coerces it away before rendering — but the
> plugin payload re-emits the un-coerced authored values.** This is the real,
> proven root cause and it supersedes round 2's F1 framing (which was correct in
> spirit but blamed only Figma; the defect is in *our* serializer).

### The proof (all from code)
1. **Our engine enforces the exact Figma rule and coerces it away.** `frame-model.ts`
   `enforceFillHugInvariant` is documented verbatim: *"if a HUG parent has ANY
   child that is FILL on the primary layout axis, the parent is coerced to FIXED
   on that axis, freezing at its measured size."* It returns a
   `Map<frameId, CoercedOverride>` (e.g. `{ sizingW:'FIXED', width }`). So our own
   autolayout does **not** render primary-axis fill-under-hug — it rewrites the
   parent to FIXED.
2. **The coercion is stored in a side map, never written onto the frame.** It
   populates the `coerced` map; it does **not** mutate `frame.sizingW/sizingH`.
3. **`layoutFrameTree` even reverts any transient mutation.** `layout.ts:1096-1148`:
   `captureSemanticState` (1098) → coerce (1107) → place (1139) → return
   `{ width, height, coerced }` (1141-1145) → **`finally { restoreSemanticState(root) }`
   (1146-1147)**. After the call, `frame.sizingW/sizingH` are back to the raw
   authored values; the effective sizing exists **only** in the returned `coerced`
   map.
4. **`dev-server.ts` throws that map away.** `dev-server.ts:285-290` calls
   `layoutFrameTree(diagram.root, adapter, {...})` and **ignores the return value**.
5. **The serializer then emits the raw values.** `serializeDiagramNode`
   (`dev-server.ts:248-251`) sets `sizingW: layoutSizingW` / `sizingH: layoutSizingH`,
   and `resolveAuthoredLayoutFrame` (`dev-server.ts:96-131`) reads those straight
   off `frame.sizingW` / `body.sizingW` (the restored raw values). Heading/body
   sizing comes from `heading-synthesis.ts` (`bodySizingW = FILL`,
   `bodySizingH = HUG?HUG:FILL`, heading `FILL`/`HUG`) — also raw.

### What this means
- The round-1 payload dump (`ai_workflows FILL/FILL` under a `HUG` spine) is the
  **raw authored** tree, **not** what the engine actually lays out. The engine
  coerces the offending HUG parents to FIXED and only *then* renders. The plugin
  reproduces a configuration our own renderer rejects — so of course real Figma
  rejects it too.
- So "does it read real engine settings or fake it?": **it fakes it** — it reads
  authored intent (post-`restoreSemanticState`) and never consults the engine's
  effective/coerced result. Both the preview-shell (`collectPreviewCoercedKeys`,
  "Fixed (auto)" dropdowns) and the layout renderer honor `coerced`; the Figma
  path is the only consumer that ignores it.
- Two distinct fill-under-hug gaps remain even after fixing this:
  - **Primary-axis** fill-under-hug: fixed by consuming `coerced` (parent → FIXED).
  - **Cross-axis** fill-under-hug: the engine *intentionally allows* it (a
    cross-axis FILL child fills the tallest sibling; see the `enforceFillHugInvariant`
    comment "Cross-axis FILL is NOT coerced"), but **Figma cannot express it** — a
    counter-axis "Fill" is disabled when the parent hugs that axis. This must be
    downgraded to FIXED-at-placed in the serializer specifically for the Figma target.

### Corrected next fix (smaller + more correct than round 2's code.ts rewrite)
Fix the **serializer**, not the Figma builder, first:
1. In `dev-server.ts:loadDiagramBySlug`, **capture** `const { coerced } = layoutFrameTree(...)` and thread it into `serializeDiagramNode`.
2. In `serializeDiagramNode` / `resolveAuthoredLayoutFrame`, resolve **effective** sizing per frame: if `coerced.get(frame.id)` sets `sizingW/sizingH:'FIXED'`, emit `FIXED` (+ the frozen `width/height`) instead of the raw value.
3. Additionally downgrade **cross-axis** FILL-under-HUG to `FIXED` at `placedW/placedH` for the Figma target (Figma-only reconciliation the engine doesn't need).
4. Only after the payload carries Figma-legal sizing should `code.ts` be simplified. The round-2 code.ts findings (ordering, dual APIs, over-nesting) still stand, but they are secondary: even a perfect builder cannot legalize an illegal payload.

This is verifiable in-repo without Figma: assert that the telecom payload contains **no** FILL child under a HUG parent on either axis after serialization — a test the current layout-blind fake cannot fake around.

---

## RE-REVIEW ROUND 2 (2026-07-10) — after the "make layoutSizing authoritative" patch failed in real Figma


> Live Figma MCP / canvas inspection was **not available** in this environment.
> This round is based on the current `code.ts` / `dev-server.ts` source plus the
> user's real rerun result ("no change"). Per instructions, the real rerun
> outcome outweighs the green local tests. **Round-1's "payload is correct, the
> bug is purely client property assignment" conclusion is now judged
> directionally wrong**: the payload is self-consistent *for the layout engine*,
> but it encodes sizing combinations Figma's constraint solver cannot legally
> represent. This is a mapping/architecture problem, not a property-write bug.

### 1. Findings (ordered by severity)

**F1 — FILL-under-HUG is structurally impossible in Figma; the importer forwards it verbatim (ROOT CAUSE, inferred from Figma rules + proven from payload).**
- Payload (round-1 dump) has `ai_workflows sizingW=FILL sizingH=FILL` living under rows whose height is `HUG` (`services_row FILL/HUG`, `page …/HUG`). The whole vertical spine hugs.
- Figma disables "Fill container" on an axis when the parent is set to "Hug contents" on that axis. So `FILL` vertical under a `HUG`-height parent is rejected → Figma silently keeps `Fixed`.
- The layout engine allows FILL-under-HUG because it resolves sizes **globally with measured geometry** (`_layout.placedW/placedH`); "FILL" there means "match the computed row height," which Figma's **local** solver cannot reproduce.
- Proven: `resolveImportedNodeSizing` (`code.ts:549`) and `appendAutoLayoutChild` (`code.ts:360`) forward `normalizeSizing(child.sizingW/H)` unchanged; `dev-server.ts:248-251` emits the authored FILL/HUG. Nothing reconciles parent-hug vs child-fill legality.

**F2 — Parent sizing is mutated AFTER children were assigned FILL, invalidating them (PROVEN from code).**
- Non-root headed container: children appended+filled at `code.ts:1012-1023`, then `finalizeFrameOwnSizing(body,…)` (`:1026`) and `appendAutoLayoutChild(frame, body, node.bodySizingW, node.bodySizingH)` (`:1027`) re-write `body.layoutSizingVertical = "HUG"`. Setting a frame to HUG flips its primary/counter axis to `AUTO`; any child previously set to `FILL` on that axis becomes illegal and Figma downgrades it to `Fixed`.
- `coerceParentAxesForFillChildren` (`:315-345`) tries to pin the parent `FIXED` *before* the child loop, but step `:1027` (and root path `:941`) undoes it afterward. The fake (`code.test.ts:113`) only throws when you *set a child* to FILL under a hugging parent — it never re-evaluates children when the *parent* is later set to HUG, so the suite is blind to this.

**F3 — Dual sizing APIs fight each other (PROVEN from code).**
- `applyFrameOwnSizing` (`:236-267`) sets `primaryAxisSizingMode`/`counterAxisSizingMode` **and** calls `resizeWithoutConstraints` (`:266`), then `appendAutoLayoutChild`→`setNodeSizing` (`:147`) later sets `layoutSizingHorizontal/Vertical`, and `finalizeFrameOwnSizing` (`:269`) resizes again. Last writer wins nondeterministically; the explicit resize + axis-mode writes can leave a frame reporting `Fixed` even after a `FILL/HUG` assignment.
- `applyFrameOwnSizing` also gates the `layoutSizing*` writes on `parent.layoutMode` (`:249-252`); at creation time `figma.createFrame()` is parented to the **page**, so those writes are skipped and only the legacy axis-mode path runs — meaning creation-time sizing is done entirely through the API round-1 said to stop using.

**F4 — Deep, mostly-redundant wrapper tower around text (PROVEN from code).** See §3. A headed container heading is 4 frames deep before the glyphs: `header frame → text stack → block frame → line node`, plus inter-block spacer frames, plus a root-only `content` wrapper.

**F5 — Per-line text explosion (PROVEN from code).** `MockTextAdapter` pre-splits, and `createTextBlocksFrame` (`:658-710`) emits **one Figma TEXT node per wrapped line** inside a per-block frame. A 3-line label = 3 text nodes + 1 block frame + 1 stack frame instead of 1 editable text node.

**F6 — Root double-wrapper (PROVEN from code).** `createRootWrapperFrame` (FIXED/FIXED, `:583`) + a `content` FILL/FILL child (`:863`) are two frames doing one job.

**F7 — Spec/tests give false green (PROVEN).** `FakeSceneNode` models a *simplified* validity rule and never recomputes on parent mutation; `spec.md` is still `Status: Draft` (`spec.md:5`) and FR-004/FR-007a describe "fixed outer" while the code ships authored autolayout — the contradiction flagged in round 1 is unresolved.

### 2. Why autolayout still fails after the latest patches
- **Frame-own vs child sizing:** the patch made `layoutSizing*` "authoritative," but F3 shows it is still one of three writers, and F2 shows the parent is re-hugged after the child fill. "Authoritative last write" landed on the parent, not the child.
- **Parent/child ordering:** sizing is applied bottom-up-ish (child fill, then parent hug). Figma requires strict top-down: fully configure parent sizing, append, then set child sizing, and never touch parent sizing again. The current order guarantees fill children get reset.
- **Impossible FILL-under-HUG (F1):** the dominant cause. The telecom spine hugs vertically, so every authored vertical `FILL` (e.g. `ai_workflows`) is illegal and reverts to Fixed regardless of how cleanly it is assigned. No client-side write can fix an illegal combination.
- **Root/page:** re-parenting the root to the page forces it Fixed (fine for root), but the root wrapper/content split means the "real" root sizing lives one frame in, and its FILL/FILL content sits under a FIXED wrapper — workable, but it is extra surface that hides where sizing actually resolves.
- **Some nodes should not be auto-layout frames at all:** leaf text should be a TEXT node (HUG), icons FIXED — not wrapped in auto-layout stacks. Several wrapper frames exist only to re-host a single child.
- **Encoding placed geometry Figma can't honor:** yes. The importer transplants the engine's globally-solved `placedW/placedH` + FILL/HUG intent 1:1. Figma re-solves locally and rejects the parts that only made sense globally. The importer is over-modeling the engine.

### 3. Deep nesting review
Current headed-container output (non-root):
```
container semantic frame            (createSemanticAutoLayoutFrame :951)
├─ header frame                     (:963)  ← only needed when a header icon exists
│  └─ text stack   "…/text"         (createTextBlocksFrame :665)  ← redundant
│     └─ block frame "…/block-1"    (:674)                        ← redundant
│        └─ line node (TEXT)        (createTextLineNode :630)      ← 1 per line (F5)
│     └─ spacer "…/gap-N"           (:697)                        ← redundant
└─ body frame                       (:1000)  ← needed only if child direction differs
   └─ child frames…
```
Root adds `root wrapper → content` on top (`:862`, `:863`).
- **Structurally necessary:** the container frame; the body frame *only when* children flow in a direction different from the header stack; the header frame *only when* a header icon needs side-by-side layout.
- **Redundant (exist for importer convenience, not Figma need):** text stack, per-block frame, per-line text nodes, inter-block spacer frames, root `content` wrapper, header frame when there is no icon, root wrapper (can be the auto-layout frame itself).
- Net: text is ~4 layers too deep; every headed container carries 1-3 avoidable frames.

### 4. Recommended redesign level: **C — fundamental flattening of the importer mapping.**
A/B cannot fix F1 (illegal combinations) or F4/F5 (nesting is baked into the build functions). Target imported shape:
- **Leaf →** one auto-layout frame: `[TEXT, icon]` (HORIZONTAL, space-between) or `[TEXT]`. Text is a single multi-line node, HUG height.
- **Headed container →** one VERTICAL auto-layout frame: `[heading, ...children]`. Heading is a single TEXT node, or a HORIZONTAL row `[TEXT, icon]` only when it has an icon. Add **one** body frame only when children flow horizontally.
- **Text →** a single TEXT node, fixed width = reserved text column, `textAutoResize = HEIGHT`, let Figma wrap. Delete per-line/per-block/stack frames and spacers.
- **Root →** the auto-layout frame itself (FIXED width, HUG/FIXED height). Delete the wrapper+content pair.
- **Remove entirely:** text stack, block frames, per-line nodes, gap spacers, root content wrapper, icon-less header frames, `createRootWrapperFrame`.
- **Sizing reconciliation (top-down):** a child may be `FILL` on an axis **only if** its parent is `FIXED`/`FILL` on that axis; otherwise downgrade to `FIXED` at `placedW/placedH`. `HUG` only for text and genuine content-huggers. Set sizing strictly after full parenting; never re-touch a parent's sizing.

### 5. Definitive next fix (smallest step that helps BOTH problems)
Two coordinated rewrites in `apps/figma-plugin/src/code.ts`:
1. **`createTextBlocksFrame` + `createTextLineNode` → one `createTextNode`** returning a single multi-line TEXT node (join lines with `\n`, fixed width, `textAutoResize=HEIGHT`). Removes 2-3 wrapper layers per text and the per-line explosion in one shot.
2. **Replace `applyFrameOwnSizing` / `finalizeFrameOwnSizing` / `appendAutoLayoutChild` with a single top-down `configureFrame(parent)` → append → `applyResolvedChildSizing(child, parent, wantW, wantH)`** that (a) sets `layoutSizing*` only after parenting, and (b) downgrades `FILL`→`FIXED(placed)` when the parent hugs that axis. Delete `coerceParentAxesForFillChildren`, the double axis-mode/resize writes, and the "finalize after children" calls.
- Then simplify `buildContainerNode` (drop root `content`/wrapper split; make container the auto-layout frame; body frame only when direction differs) and `buildLeafNode` (text node + icon directly).

### 6. Verification plan (real Figma)
1. `npm run figma-plugin:serve` with a **fresh** `packages/layout-engine/dist` (round-1 F4 stale-dist trap), import telecom into the linked file.
2. Inspect and record, per node — **Horizontal/Vertical resizing dropdown**, wrapper count to first content, subtree depth, text editability, icon alignment:
   - `services_layer` (expect Fill width where parent allows, else Fixed; Hug height)
   - `ai_workflows` (was FILL/FILL under a hug spine — confirm it is now a deliberate Fixed-at-placed, not a silent Fixed)
   - `compute_nodes` (Hug/Hug)
   - `whitebox_switches` (leaf, Hug/Hug)
   - one text-heavy leaf (label wraps): expect a **single** editable TEXT layer, ≤1 wrapper frame, icon still pinned top-right.
3. Pass bar: dropdowns match intended sizing (no unexplained Fixed), heading text ≤1 wrapper deep, text double-click-editable (not placeholder boxes), icons aligned.

### 7. Is the architecture wrong? Yes — replacement philosophy
- The engine solves sizing **globally**; Figma solves it **locally**. Do not transplant engine FILL/HUG 1:1 — translate it.
- Treat the payload's `placedW/placedH` as the source of truth and derive Figma sizing from it, downgrading any combination Figma can't express to Fixed-at-placed.
- One semantic node → at most one auto-layout frame (+ at most one body frame when direction changes). No convenience wrappers.
- Text is a single editable TEXT node; never a stack of per-line frames.
- Configure sizing strictly top-down; a parent's sizing is frozen before its children are sized, and never mutated afterward.
- FILL requires a non-hug parent on that axis — enforce this as a hard precondition, not a warning.
- Put semantic/structure decisions in the serializer (`dev-server.ts`), keep `code.ts` a thin, dumb frame emitter.
- Prefer fewer frames that Figma lays out correctly over many frames that reproduce engine internals.

---

# (round 1, retained below)

# Adversarial review — Spec 078 Figma autolayout plugin (2026-07-09)


> **UPDATE 2026-07-10 — root cause isolated to the Figma client, NOT the payload.**
> After the first round of fixes, the reported symptom was "every imported node
> is `FIXED`; none get the correct `FILL`/`HUG`." I captured the actual server
> output for `ai-infra-telecom-services-stack` (ran the layout engine exactly as
> `dev-server.ts` does and dumped `frame.sizingW/sizingH/positionType`). **The
> payload is correct** — sizing is faithfully authored, e.g.:
>
> ```
> page              sizingW=FIXED sizingH=HUG    (root, correct)
> services_layer    sizingW=FILL  sizingH=HUG
> services_row      sizingW=FILL  sizingH=HUG
> network_assurance sizingW=FILL  sizingH=HUG   (leaf)
> ai_workflows      sizingW=FILL  sizingH=FILL
> compute_nodes     sizingW=HUG   sizingH=HUG
> whitebox_switches sizingW=HUG   sizingH=HUG   (leaf)
> ```
>
> So `FILL`, `HUG`, and `FIXED` are all present and sensible in the payload, and
> only the root is `FIXED` (by design). **Stop investigating the YAML → payload
> layer — it is not the bug.** The defect is 100% in `code.ts`, where the builder
> fails to make Figma actually apply `layoutSizingHorizontal/Vertical`, so Figma
> falls back to `FIXED`. This is exactly why the unit tests are green: the
> `FakeSceneNode` just stores whatever string you assign and never enforces
> Figma's real auto-layout validation (see §5). See "Client-side root cause"
> below.

## Client-side root cause & fix direction (the actual blocker)

The payload proves intent survives to the wire; the loss happens on assignment in
Figma. Prioritized suspects, all in `apps/figma-plugin/src/code.ts`:

1. **Mixing the legacy axis API with the unified sizing API.**
   `applyAutoLayoutIntrinsicSizing()` sets `primaryAxisSizingMode` /
   `counterAxisSizingMode` **and** `resizeWithoutConstraints()` at frame-creation
   time (before the frame is parented), and then `appendAutoLayoutChild()` sets
   `layoutSizingHorizontal/Vertical` after parenting. In real Figma these two
   APIs interact; a frame pinned to explicit axis modes + an explicit resize can
   end up reporting `FIXED` even after you assign `FILL`/`HUG`. Prefer ONE model:
   set `layoutMode` on the child, append it into the auto-layout parent, and set
   ONLY `layoutSizingHorizontal/Vertical` afterward. Drop the premature
   `primaryAxisSizingMode`/`counterAxisSizingMode`/`resizeWithoutConstraints`.
2. **`FILL` on an axis the parent hugs is silently refused.** Figma will not let a
   child `FILL` an axis whose parent auto-layout hugs that axis; depending on
   build it either throws or silently keeps `FIXED`. Since import completes with
   no error but all-`FIXED`, the silent path is likely. Ensure a parent that
   contains any `FILL` child is itself `FIXED` (or `FILL`), never `HUG`, on that
   axis — or reorder so the parent's sizing is finalized before children are set.
3. **Root re-parented to the page resets its sizing.** Appending the root frame
   to `figma.currentPage` (not an auto-layout node) forces its `layoutSizing*`
   back to `FIXED`. That is fine for the root (it is meant to be `FIXED`), but do
   not let the same reparent/resize pattern touch descendants.

**Definitive next debugging step:** immediately after each
`node.layoutSizingHorizontal = X` / `...Vertical = Y`, read the property back and
`console.warn` when `node.layoutSizingHorizontal !== X`. Run the telecom import
once; the warnings will name the exact nodes Figma rejected and reveal which of
the three mechanisms above is firing. This is the check the `FakeSceneNode` suite
structurally cannot perform, so it must be done against real Figma (or a fake
that reproduces the parent-hug/FILL rejection rule).

---


Scope: `specs/078-figma-autolayout-plugin/{spec,plan,tasks}.md`, `apps/figma-plugin/src/{code.ts,dev-server.ts,code.test.ts}`, and the YAML → payload → Figma sizing translation. Review only, no implementation changes made.

## TL;DR verdict

The autolayout sizing pipeline is **mostly wired correctly** (authored `HUG`/`FILL`/`FIXED` do survive into Figma child sizing), so the inbox premise "imported nodes behave as fixed-width/fixed-height" is **not literally true in the code as written** — the more likely real causes of the bad parity are (a) a **stale-`dist` payload trap**, (b) **fragile color/id-string heuristics in the payload server** that silently misclassify or mis-nest real diagrams, and (c) **tests that assert property assignment, not Figma layout behavior**, giving green-but-wrong confidence. Spec/plan/tasks also contain a live self-contradiction about the sizing strategy.

## 1. Fixed width/height forcing — mostly a non-issue, with caveats

Traced end to end and the enum values line up: `Sizing` in `frame-model.ts` is a string enum (`HUG`/`FILL`/`FIXED`), so `dev-server.ts` emits those literals and `code.ts` `normalizeSizing()` accepts them. My initial hypothesis (an enum-case mismatch collapsing everything to `FIXED`) is **wrong** — worth stating so the next agent doesn't chase it.

Authored sizing does propagate: `resolveImportedNodeSizing()` only hard-pins `root` to `FIXED/FIXED`; every other node uses `normalizeSizing(node.sizingW/H)`, and `appendAutoLayoutChild()` sets `layoutSizingHorizontal/Vertical` from those, which is what actually governs a child inside an auto-layout parent.

Caveats that still bite parity:

- **`applyAutoLayoutIntrinsicSizing()` always calls `resizeWithoutConstraints(placedW, placedH)`** even for `HUG` axes, then flips the axis to `AUTO`. The pre-size is redundant for hug and can briefly fight Figma's hug pass; harmless in the fake, unverified on real canvas.
- **Container body height is hand-computed**: `innerHeight - headerFrame.height - headerGap` (lines ~754, ~833). This re-derives geometry that auto-layout is supposed to own. When `bodySizingH` is `FILL` the number is ignored; when `HUG` it's moot — so it is at best dead arithmetic and at worst a source of drift if header height measured in Figma ≠ server's `headerMinHeight`.
- **`stretchWithinParent(content)` is effectively dead code**: `content` is a child of the VERTICAL auto-layout root wrapper, and Figma ignores `constraints` on auto-layout children. It reads as intent that does nothing.

## 2. Missing text masking geometry — partly, plus a determinism concern

- Text lines are **pre-split server-side by `MockTextAdapter`** and emitted as one Figma text node per line with `FIXED` width + `textAutoResize=HEIGHT`. So Figma never re-wraps — fidelity is only as good as Mock metrics matching the real font. This is deterministic but means wrap parity is silently coupled to a mock, not the real Figma font engine. FR-005's "reserve a fixed text column so wrapped text stays stable" is technically met, but visual parity is not guaranteed.
- The font fallback chain (`Ubuntu Sans` → `Inter`) drops to a **placeholder box** on load failure (`createTextLineNode` catch). This is consistent with the inbox's "text shows as boxes" symptom — it's likely a **font-availability failure in the target file**, not a geometry bug. Recommend confirming Ubuntu Sans is actually available/loaded in the test file before attributing anything to layout.

## 3. YAML/authored override translation — the real fragility lives in `dev-server.ts`

This is the highest architectural-regression risk (inbox focus #5). The payload server **re-derives semantic meaning that the layout engine / preview-shell already own**, using brittle literals:

- **`classifyFrame()` keys off resolved color literals** — `#F3F3F3` → panel, `#000000`+`#FFFFFF` → highlight, transparent-fill+stroke → section. Any token change in `tokens.ts`/`resolve-styles` silently reclassifies or misclassifies nodes. Role should come from the frame class/role the engine already knows, not a color guess.
- **`resolveAuthoredLayoutFrame()` / `findSyntheticHeading()` string-match `__body` / `__heading` suffixes and `role==='heading'`** to reconstruct heading/body split. This duplicates `heading-synthesis.ts` internals; if the synthesis id/role convention changes, the importer silently mis-nests or drops the body — a plausible cause of "lost parts of the hierarchy" from the spec's own status notes.
- **Magic numbers duplicated across both files**: icon column `48 + 8`, `size: 48`, `fontSize: 18`, `lineHeight: 24`, `minHeight: 64`. These restate `tokens.ts` in a second place; `serializeIcon()` even hard-codes `size: 48` regardless of the real icon token. Drift here surfaces as subtle geometry mismatch, not a crash.

Net: the importer is quietly re-implementing engine semantics in the payload layer instead of consuming them — exactly the "drift away from layout-engine / preview-shell contracts" the review was asked to watch for.

## 4. Stale-`dist` payload trap (most likely practical cause of "parity is wrong")

`dev-server.ts` imports directly from `packages/layout-engine/dist/*.js`. The plugin's `serve` script (`tsx src/dev-server.ts`) has **no prebuild hook** — only `build` runs `prebuild`. So `npm run figma-plugin:serve` can serve **stale or missing `dist`** if layout-engine `src` changed without a rebuild, yielding wrong `placedW/placedH`/sizing in the payload that then gets blamed on the importer. This mirrors the repo's existing `clean:src-artifacts` / browser-bundle-freshness concerns but is unguarded here. Recommend a `preserve` build hook or a freshness check.

## 5. Tests give green-but-wrong confidence

`code.test.ts` uses a `FakeSceneNode` that **does not model auto-layout** — `FILL`/`HUG` never recompute sizes, `resizeWithoutConstraints` just stores numbers. The tests therefore assert *that properties were set*, not that Figma would lay the tree out correctly. That is why they can be green while the inbox reports real parity is broken. The suite also never exercises `dev-server.ts` classification/nesting (the actual fragile code). Per `docs/agent-index.md` test-economy this shouldn't become a giant browser harness, but at minimum `classifyFrame` and `resolveAuthoredLayoutFrame` deserve unit coverage against a real frame tree, since that is where silent parity loss originates.

## 6. Spec / plan / tasks accuracy — a live contradiction

- **`spec.md` still reads `Status: Draft`** despite Phases 1–3 complete and the feature under closeout-style review. Stale.
- **Direction contradiction**: `spec.md` "Active Implementation Direction" and FR-007a mandate *fixed outer geometry* (layout-engine `width`/`height` as fixed outer box, auto-layout only inside). But `plan.md` Phase 6 + "Active Blocker" pivot *back* to authored autolayout semantics (`sizing_w/h`, not frozen dimensions), and **the code follows the autolayout approach** via `createSemanticAutoLayoutFrame`. The fixed-box implementation (`createOuterBoxFrame`) exists but is **dead code — defined, never called**. So the spec's headline strategy contradicts both the plan and the shipped code. Pick one and delete the loser (both the prose and `createOuterBoxFrame`).
- `tasks.md` T030/T035 are unchecked, but the builder already implements the T035 autolayout-semantics direction and abandoned T030's fixed-box direction — tasks no longer describe reality.
- **Weak acceptance criteria**: SC-002/SC-004a ("matches contract", "no missing semantic boxes") have no repo-owned check. Given inbox says parity is still wrong, these cannot be claimed. Per AGENTS.md, anything touching the persist/override path needs a repo-owned regression before Closeout Ready — currently absent.

## Recommended next actions (for the implementing agent, prioritized)

1. Add a `dist` freshness guard (or `preserve` prebuild) to `figma-plugin:serve`; re-verify parity with a *known-fresh* payload before touching builder logic.
2. Confirm Ubuntu Sans loads in the target file; rule font failure in/out before treating boxes as a geometry bug.
3. Replace `classifyFrame` color-literal heuristics and `__body/__heading` string-matching with the engine's owned frame class/role + synthesis output; delete duplicated magic numbers in favor of `tokens.ts`.
4. Delete dead `createOuterBoxFrame` + `stretchWithinParent`, and reconcile spec.md ("fixed outer geometry") vs plan.md/code (authored autolayout). Update spec `Status`.
5. Add targeted unit coverage for `dev-server.ts` classification/nesting against a real frame tree (not the layout-blind fake).
