# Opus adversarial merge review — Spec 079 (figma component variant import)

**Verdict (post-remediation): Merge with follow-ups.** The final-pass stale
golden was regenerated from the committed production-contract fixture and the
full layout-engine suite now passes. The real-Figma visual check remains the
release gate.

> Verdict history: first pass **Do not merge** → re-review **Merge with
> follow-ups** → final pass **Do not merge as-is** (stale golden) →
> post-remediation **Merge with follow-ups**.

---

## Post-review remediation (2026-07-13)

The production-contract draw.io golden was regenerated with the local YAML WIP
stashed, and `npm --prefix packages/layout-engine test` passes **1011/1011**
against the committed fixture. The relevant semantic node is `regional_site`:
it is the only one of the three site nodes with children, so it is correctly
promoted to panel chrome. `core_cloud` and `edge_site` have no children and
remain leaf chrome, as required by the headed **non-leaf** rule.

---

## Final pre-merge review (2026-07-13, third pass)

Two new commits landed since the re-review:
`62664f1 fix(figma): preserve headed container components` (the classifier +
chrome fix the re-review evaluated, now committed) and
`c5c833b fix(layout): normalize headed container chrome` (which addresses F1 and
F2 upstream). Both follow-ups are resolved correctly:

- **F1 resolved, palette-general.** The fixture-coupled `resolveSerializedChrome`
  grey special-case is deleted. `packages/layout-engine/src/resolve-styles.ts`
  now promotes any headed non-leaf level-1 container to level-2 chrome
  (`if (!isHighlight && level < 2 && hasSemanticContainerText(root)) level = 2;`)
  *before* the nesting constraints, so chrome resolves through the normal level
  path for any palette. The serializer reads `frame.resolvedFill`/`resolvedStroke`
  generically. New layout-engine test asserts a headed level-1 container resolves
  `#F3F3F3` fill/stroke.
- **F2 resolved.** The classifier gained `&& !context.parentIsPanel`, and the
  resolveStyles promotion runs before the `level >= 2 && parentIsPanel` demotion,
  so a headed container nested directly inside a panel stays structural
  (transparent/black), not nested grey-on-grey. Regression tests were added at
  both layers (`resolve-styles.test.ts` and `dev-server.test.ts`).

**Test status:**
- `apps/figma-plugin` → **46/46 pass**.
- `packages/layout-engine` → **1010 pass, 1 FAIL**: `export-frame-drawio >
  matches golden draw.io for ai-infra-production-contract`.

### Blocker — stale `ai-infra-production-contract` golden (verified at HEAD)

**Evidence.** With the uncommitted production-contract WIP stashed (i.e. the
fully committed branch state), `matches golden draw.io for
ai-infra-production-contract` still fails, while `ai-infra-telco-value-map` and
`ai-infra-telecom-services-stack` pass.

**Cause.** `c5c833b`'s shared `resolveStyles` change promotes headed level-1
containers to grey panel chrome. Committed `ai-infra-production-contract.yaml`
contains three such containers — `Core cloud - central control and governance`,
`Regional site - policy enforcement and aggregation`, and `Edge site - local
execution (degraded mode OK)` — so their exported fill/stroke changed. `c5c833b`
regenerated the value-map and telecom goldens (confirmed: it is the last commit
to touch both), but did not regenerate the production-contract golden (last
touched by the unrelated `31d56f4`). So the branch ships a red golden.

**Impact.** CI-visible test failure at HEAD; the three production-contract site
containers now render as grey panels in the draw.io deliverable, an intended but
unverified visual change.

**Remediation (smallest safe).** Regenerate only that golden and eyeball the
result:

```
# stash the uncommitted production-contract WIP first so the golden encodes the
# COMMITTED yaml, not local edits:
git stash push -- diagrams/1.input/ai-infra-production-contract.yaml
UPDATE_DRAWIO_GOLDEN=1 npm --prefix packages/layout-engine test -- export-frame-drawio
git stash pop
```

Confirm the three headed site containers are meant to become grey panels (they
now match the value-map quadrant treatment). If that treatment is *not* desired
for production-contract, the fix belongs in the fixture/level authoring, not a
golden bump. Either way, HEAD must not ship a failing golden.

**Blast radius is contained.** The full layout-engine suite (1011 tests) has
exactly this one failure, so no SVG goldens or other diagrams regressed.

### Data-integrity note

The user's genuine WIP — the uncommitted `ai-infra-production-contract.yaml`
edit (44+/43-) and local `image copy.png` — is intact and was not committed.
(The production-contract `.drawio` golden briefly showed as modified at the start
of this pass but matched HEAD and was not part of the user's stated WIP; it is
now clean.)

**Bottom line:** resolve the one stale golden (regenerate + visual confirm), then
the branch is mergeable. Everything else on the branch is in good shape:
component preservation is general, chrome fidelity is palette-independent, nested
demotion is correct, and all four are guarded by regressions. The real-Figma
visual verification remains a release gate.

---

## Re-review update (2026-07-13, second pass)


The working tree now carries an uncommitted fix (not yet in a commit) that
resolves the first-pass P1. `npm --prefix apps/figma-plugin test` → **46/46 pass**
(two new regressions). Payloads and raw resolved chrome were re-generated via
`tsx` to verify the values below.

**What the fix does — verified correct:**

- **Classifier is now level-independent for headed containers.**
  [apps/figma-plugin/src/dev-server.ts](../../apps/figma-plugin/src/dev-server.ts#L324)
  replaces the `level >= 2` panel gate with
  `else if (!frame.isLeaf && hasSemanticContainerText(frame)) { kind = "panel"; }`.
  This is a *general* rule (keyed on frame-owned heading text, not a numeric
  level or a fixture), so `operational_ai`, `customer_ai`, `network_ai`,
  `ai_services_revenue` now serialize as `kind=panel` and import as live
  `Role=Parent` instances, while textless `value_quadrants` / `value_top_row` /
  `value_bottom_row` stay raw `container` frames. Component-preservation for
  arbitrary headed YAML — the prompt's core requirement — is genuinely met.
- **Regressions added and meaningful.**
  [apps/figma-plugin/src/code.test.ts](../../apps/figma-plugin/src/code.test.ts#L1195)
  asserts the four quadrants import as `INSTANCE` with `mainComponent = Role=Parent`
  and `componentRole = Parent` (no detach), and that the three wrappers remain
  raw `FRAME` with no component role — the required component-mode identity
  regression.
  [apps/figma-plugin/src/dev-server.test.ts](../../apps/figma-plugin/src/dev-server.test.ts#L331)
  asserts panel `kind`/fill/stroke/heading and that the wrappers stay `HUG`, plus
  `collectFillUnderHugViolations(...) === []` — a real tree-wide no-overflow/Hug
  guard ([apps/figma-plugin/src/dev-server.test.ts](../../apps/figma-plugin/src/dev-server.test.ts#L29)).
  Both are the second-fixture regressions the prompt required.
- **Fixture hygiene fixed.** The redundant no-op `label: Clean network fabric` on
  `regional_edge` was removed
  ([diagrams/1.input/ai-infra-telecom-services-stack.yaml](../../diagrams/1.input/ai-infra-telecom-services-stack.yaml)).

**Residual follow-ups (non-blocking, but should be tracked):**

1. **F1 — chrome restoration is palette-coupled to grey (root cause is upstream).**
   The chrome fix
   [apps/figma-plugin/src/dev-server.ts](../../apps/figma-plugin/src/dev-server.ts#L348)
   only recovers box styling when `frame.fill === Fill.GREY && frame.border === Border.SOLID`.
   The reason it is needed at all: the layout engine's `resolveStyles` resolves a
   headed *level-1* container as leaf chrome. Verified raw values for
   `operational_ai`: authored `fill=#F3F3F3`, `border=SOLID`, but
   `resolvedFill=transparent`, `resolvedStroke=#000000` — whereas the level-2
   `production_foundation` resolves `#F3F3F3` / `#F3F3F3` correctly. So a headed
   level-1 container authored with any *non-grey* fill (e.g. `fill: blue,
   border: solid`) still serializes `transparent` fill and a **black** border
   via the `else` branch, which continues to violate the "arbitrary selected
   YAML" fidelity goal outside the grey palette. No fixture exercises a non-grey
   headed level-1 container, so this is latent. The durable fix belongs in
   `packages/layout-engine` `resolveStyles` (resolve panel chrome for any headed
   non-leaf regardless of level), after which the grey special-case can be
   deleted rather than extended per color.

2. **F2 — the `parentIsPanel` demotion is now dead for headed containers.**
   [apps/figma-plugin/src/dev-server.ts](../../apps/figma-plugin/src/dev-server.ts#L312)
   still lowers `level` to 1 when a `level >= 2` node sits directly inside a
   panel, but the new headed-container branch is evaluated on
   `hasSemanticContainerText` *before* `level` is consulted, so that demotion no
   longer affects headed containers. A headed non-leaf container nested directly
   inside a panel would now render nested Parent-in-Parent chrome. No current
   fixture has that shape (panels here contain leaves or textless rows), so it is
   latent — but confirm it is intended and add coverage if headed-inside-panel is
   a real authoring pattern.

**Merge recommendation:** commit the working-tree fix (it is currently
uncommitted), file F1/F2 as follow-ups, and keep the real-Figma visual gate as a
release check. With that, the branch is mergeable.

---

## First-pass findings (RESOLVED — retained as history)

Scope reviewed: branch `feat/079-figma-component-variant-import` vs merge base
`d677b689e91feea22f8511de07a012110e4ae628`. First-pass command:
`npm --prefix apps/figma-plugin test` → **44/44 pass** (now 46/46). Payloads were
generated directly from `createFrameDiagramPayload(...)` (via `tsx`) for both
`ai-infra-telco-value-map` and `ai-infra-telecom-services-stack`. The remaining
real-Figma visual gate was not exercised and is not claimed as passed.

---

## P1 — Headed level-1 containers demote to raw frames and lose fill/border (RESOLVED in re-review)

**Where:** [apps/figma-plugin/src/dev-server.ts](../../apps/figma-plugin/src/dev-server.ts#L308)
(`resolveFrameSemanticState`) and [apps/figma-plugin/src/dev-server.ts](../../apps/figma-plugin/src/dev-server.ts#L422)
(fill/stroke/padding strip for `structuralContainer`).

**The gate.** Panel classification is fenced behind a `level >= 2` floor:

```ts
} else if (level >= 3) {
  kind = "section";
} else if (level >= 2 && (frame.isLeaf || hasSemanticContainerText(frame))) {
  kind = "panel";
} else if (frame.isLeaf) {
  kind = "leaf";
}
```

`hasSemanticContainerText(frame)` — the intended "does this container own visible
heading text?" signal — is only ever consulted **inside** the `level >= 2`
branch. A non-leaf container authored at `level: 1` with a real heading never
reaches it and falls through to the default `kind = "container"`, i.e. a raw,
transparent, chrome-less auto-layout frame.

**Reproduction (in-repo, no live Figma needed).** Payload generated from
[diagrams/1.input/ai-infra-telco-value-map.yaml](../../diagrams/1.input/ai-infra-telco-value-map.yaml):

| node | authored | payload `kind` | `headerMinH` | header icon | payload `fill` / `stroke` |
|------|----------|----------------|--------------|-------------|---------------------------|
| `operational_ai` | `level: 1`, `heading: 1. Operational AI`, `icon: Operations.svg`, `fill: grey`, `border: solid` | **container** | 48 | **true** | **transparent / none** |
| `customer_ai` | `level: 1`, heading + icon + grey/solid | **container** | 48 | true | transparent / none |
| `network_ai` | `level: 1`, heading + icon + grey/solid | **container** | 48 | true | transparent / none |
| `ai_services_revenue` | `level: 1`, heading + icon + grey/solid | **container** | 48 | true | transparent / none |
| `production_foundation` | `level: 2`, heading | **panel** | 48 | — | #F3F3F3 / #F3F3F3 |
| `business_outcomes` | `level: 2`, heading | **panel** | 48 | — | #F3F3F3 / #F3F3F3 |

The four headed quadrants carry a real synthesized heading (`headerMinH=48`,
`hasHeaderIcon=true`) yet are classified as structural containers, while the two
level-2 siblings with the same shape become panels. So the demotion is driven
purely by the `level >= 2` gate, exactly the level-gate defect the prompt asked
to confirm.

**Two coupled user-visible effects:**

1. *Lost component identity.* Because `isMappedComponentNode` returns `false`
   for `kind === "container"` ([apps/figma-plugin/src/code.ts](../../apps/figma-plugin/src/code.ts#L1746)),
   these nodes never route through `buildComponentMappedNode`. They import as raw
   auto-layout frames via `buildContainerNode`
   ([apps/figma-plugin/src/code.ts](../../apps/figma-plugin/src/code.ts#L2174)) — no
   `Role=Parent` instance, no live `SLOT`, no user-authored box chrome. This is
   the prompt's "imported as raw frames rather than live components," confirmed.

2. *Lost fill and border.* The serializer forces `fill: "transparent"`,
   `stroke: "none"`, `strokeWidth: 0`, and zero padding whenever
   `structuralContainer` is true ([apps/figma-plugin/src/dev-server.ts](../../apps/figma-plugin/src/dev-server.ts#L422)).
   `operational_ai` et al. author `fill: grey` / `border: solid`, so the
   misclassification also discards their visible fill and border. The heading
   text and icon still render (via `buildContainerNode`), but on a transparent,
   borderless frame — visibly wrong against the source `image copy.png`.

**Why this is merge-blocking, not cosmetic.** `FR-002` requires the workflow to
support arbitrary frame YAML, and the checklist marks "Arbitrary YAML import is
specified as the primary workflow" as done
([specs/079-figma-component-variant-import/spec.md](../../specs/079-figma-component-variant-import/spec.md#L226),
[specs/079-figma-component-variant-import/checklists/requirements.md](../../specs/079-figma-component-variant-import/checklists/requirements.md#L12)).
The component-preservation promise silently fails for a legitimate authoring
pattern (headed container at `level: 1`) that appears in a committed fixture on
this very branch. The telecom fixture happens to author every headed container
at `level >= 2`, which is why the existing tests are green while the contract is
broken for arbitrary input.

**Smallest safe remediation.** Make the panel decision depend on the semantic
signal, not the numeric level: a non-leaf container with
`hasSemanticContainerText(frame)` should classify as `panel` even at level 1,
while a genuinely textless row/stack (e.g. `value_quadrants`, `value_top_row`)
must stay `container`. Concretely, add a headed-container branch before the
`level >= 2` panel branch, e.g. `else if (!frame.isLeaf && hasSemanticContainerText(frame)) { kind = "panel"; }`,
and keep the level-based branch for leaves/sections. This preserves the existing
"headingless groups stay raw" invariant (verified: `value_quadrants`,
`value_top_row`, `regional_row1`, `far_row1` own no text and would remain
`container`). Do not "fix" this by hard-coding levels in the fixture — the
prompt explicitly requires arbitrary-YAML correctness.

---

## P1 — Required value-map regressions are missing (RESOLVED in re-review)

**Where:** [apps/figma-plugin/src/code.test.ts](../../apps/figma-plugin/src/code.test.ts)
(no reference to `value-map`, `value_quadrants`, `operational_ai`, or
`ai-infra-telco-value-map` anywhere in the suite).

The prompt requires two second-fixture regressions on the value-map fixture: a
component-mode identity regression (headed container stays a live mapped box
instance; textless row/stack stays raw, without detaching) and a
no-overflow/Hug regression for the transparent wrappers. Neither exists. The
only sizing regression on the branch is the telecom `regional_edge` test
([apps/figma-plugin/src/code.test.ts](../../apps/figma-plugin/src/code.test.ts#L1158)).
Because the classifier defect above is unguarded, the suite passes while
shipping the regression. Add both regressions with the fix; they must fail
against the current classifier and pass after it.

---

## Resolved / no-finding areas (audited, reported for completeness)

- **Regional edge overflow (prompt area 3) — resolved.** Payload from the
  telecom fixture: `regional_edge` = panel, `sizingH=HUG` (h≈320),
  `bodySizingH=HUG` (≈216); `regional_row1` = container, `sizingH=HUG` (≈216).
  The full chain hugs, so no fixed-height ancestor constrains the directed row —
  the desired Hug/Fill propagation, not a masking workaround. This is asserted by
  [apps/figma-plugin/src/code.test.ts](../../apps/figma-plugin/src/code.test.ts#L1158),
  which checks panel/body/row `HUG` and equal heights. The fixture edits that
  removed explicit `sizing_h: fill` overrides
  ([diagrams/1.input/ai-infra-telecom-services-stack.yaml](../../diagrams/1.input/ai-infra-telecom-services-stack.yaml))
  are intentional V3 authoring (content-driven HUG), not geometry workarounds.

- **Transparent wrapper Hug (prompt area 3, value-map) — not reproduced at the
  serializer.** `value_quadrants`, `value_top_row`, `value_bottom_row` all
  serialize `sizingH=HUG` with `bodyHeight` equal to content height; there is no
  fixed-height transparent wrapper in the payload. Any residual "invisible
  fixed-height space" observed in live Figma would originate from the
  misclassified raw-container import path (P1 above), not from serializer sizing.
  Fixing the classification plus adding the required second-fixture Hug
  regression covers this.

- **Mutation boundaries (prompt area 1) — sound mechanism.** The instance path
  strictly addresses live `SLOT` nodes by stable master id, `assertSlotNode`
  rejects non-slot targets, and the code explicitly refuses to walk live
  instance sublayers ([apps/figma-plugin/src/code.ts](../../apps/figma-plugin/src/code.ts#L1601))
  and refuses to edit instances lacking `setProperties`
  ([apps/figma-plugin/src/code.ts](../../apps/figma-plugin/src/code.ts#L1912)). No
  detach fallback exists. The only boundary defect is *which* nodes are treated
  as components (P1), not *how* component mutation is performed.

- **Icon ownership (prompt area 4) — sound.** Icon sources are copied local
  components/instances or explicitly cloneable local SVG-named assets
  ([apps/figma-plugin/src/code.ts](../../apps/figma-plugin/src/code.ts#L1630)); there
  is no silent raw-SVG fallback in component mode. Default-icon clearing goes
  through the real icon `SLOT` with limit checks
  ([apps/figma-plugin/src/code.ts](../../apps/figma-plugin/src/code.ts#L2055)).

- **Fixed-axis restoration (prompt area 3) — correct.** `appendAutoLayoutChild`
  restores only effective `FIXED` axes after reparenting
  ([apps/figma-plugin/src/code.ts](../../apps/figma-plugin/src/code.ts#L480)); HUG/FILL
  remain auto-layout behaviors.

---

## Minor (non-blocking) — fixture hygiene

- **Redundant `label` on `regional_edge`.** [diagrams/1.input/ai-infra-telecom-services-stack.yaml](../../diagrams/1.input/ai-infra-telecom-services-stack.yaml)
  adds `label: Clean network fabric` to `regional_edge`, which already has
  `heading: Regional edge` and `helper: Clean network / fabric`. The payload's
  `textBlocks` for that node are the heading + helper only; the extra `label`
  has no observable effect. Remove it to avoid the appearance of
  geometry-forcing authoring. Not a merge blocker.

---

## Merge hygiene

- `AGENT-INBOX.md` and the spec package describe the implementation in terms of
  "level-2 nodes with frame-owned visible text," which matches the code but
  encodes the P1 defect as intended behavior. Update that language to the
  semantic-text rule once the classifier is fixed, so docs no longer bless the
  level-1 demotion.
- Local visual evidence `image copy.png` and the uncommitted
  `diagrams/1.input/ai-infra-production-contract.yaml` edit are correctly
  outside the branch; do not carry them into the merge.

## Bottom line (first pass — superseded)

Fix the level-gate classification so headed containers map to live components
regardless of authored level (keeping textless rows/stacks raw), restore their
authored fill/border, and add the two required value-map regressions.

**Re-review status:** all three were done in the working tree; the classifier is
now general, the two regressions are in place, and the suite is **46/46 green**.
The branch is **mergeable with follow-ups** — commit the uncommitted fix, track
F1 (grey-only chrome restoration; real fix belongs in `resolveStyles`) and F2
(latent nested-panel demotion), and keep the real-Figma visual verification as a
release gate.
