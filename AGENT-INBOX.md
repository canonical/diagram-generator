# Agent Inbox

Machine-generated handoffs, long diagnostics, and cross-repo follow-up notes go here.

Do not use this file for user notes. User-authored async notes belong in `INBOX.md`.

The agent should triage anything durable from this file into `TODO.md`, `STATUS.md`, `HISTORY.md`, or `docs/specs.md`, then empty this file back to this header template.

---

## Adversarial review — Spec 035 (Compatible engine switcher), Qwen's Phase 1 work

**Reviewer:** Cline (adversarial pass)
**Date:** 2026-06-08
**Scope reviewed:** uncommitted working-tree changes for spec 035:
- `packages/layout-engine/src/preview-engine/{types,registry,index}.ts`
- `packages/layout-engine/tests/preview-engine-registry.test.ts`
- `apps/preview/src/persistence/frame-diagram.ts` (+ `.test.ts`)
- `specs/035-compatible-engine-switcher/{plan,tasks}.md`

### Verdict

Phase 1 plumbing (typed compatibility contract + `meta.layout_engine` persistence) is implemented and its tests pass — **registry 13/13, persistence 11/11 (4 new), both re-run and confirmed green.** However, **the actual feature of spec 035 — the compatibility-aware engine switcher — does not exist.** What landed is contract scaffolding plus a persistence primitive, neither of which is wired into the running preview shell. Treating this as "spec 035 done" would be a significant overstatement; it is roughly the first third of the spec.

### Blocking / high-severity findings

1. **The headline deliverable is missing (Phase 2 + Phase 3 untouched).** Tasks T010 (switcher UI), T011 (rerender through selected engine), T012 (hidden/disabled incompatible-engine tests), T020–T022 (round-trip validation, docs, closeout) are all unchecked and unimplemented. FR-003 (switcher shows only compatible engines), FR-004 (rerender through the preview-engine contract), and the entire Mission/User Story 1 & 2 are unmet. There is no dropdown, no UI, no rerender path.

2. **The new compatibility API is dead code at runtime.** `evaluatePreviewEngineCompatibility`, `listCompatiblePreviewEngines`, and `listPreviewEnginesWithCompatibility` have **zero callers outside the test file.** `apps/preview/src/server.ts` still resolves engines only via `resolvePreviewEngine(...)`. So FR-002/FR-003's "typed compatibility" exists as exported functions that nothing in the product invokes. Until Phase 2 wires them in, the contract is unexercised in production.

3. **Persistence is disconnected from the compatibility contract → can persist incompatible engines.** `applyLayoutEngineChoice()` writes any string to `meta.layout_engine` with no validation against `listHostableLayoutEngineKeys()` or `evaluatePreviewEngineCompatibility()`. The persistence test itself round-trips bogus/incompatible values (`vertical-stack`). This directly contradicts FR-003 ("show only engines compatible with the current document") and Success Criterion 2 ("filters choices based on typed compatibility"). The two halves Qwen built do not talk to each other.

4. **`PreviewDocumentKind` cannot represent the "near-term engines" the plan claims to support.** `plan.md` documents a matrix for `state-machine`, `tree-mindmap`, `swimlane`, `er-class` using kinds `state-diagram`, `tree-diagram`, `swimlane-diagram`, `er-diagram`, `class-diagram`, but the type is hard-limited to `'frame-diagram' | 'sequence' | 'force-spec'`. Those rows would not typecheck. FR-006 ("contract MUST support future lanes") is asserted in prose but **not** actually expressible in the type system — misleading claim of extensibility.

### Medium-severity findings

5. **Speculative generality (gold-plating) in the AST-shape predicate engine.** `astShapePredicates`, `AstShapeContext`, `AstShapePredicateKind` (`has-arrows`, `has-nested-children`, `has-sequence-actors`, `has-force-nodes`, `max-nesting-depth`) are fully built and tested, yet **no registered engine declares a single predicate and nothing populates an `astShape` context anywhere.** Tests exercise it only through synthetic mock engines. The plan only asked to *decide* whether to evaluate against YAML metadata vs AST shape; building an entire unused predicate evaluator is surface area with no consumer and cuts against the spec's own Non-Goals.

6. **Grid/force shell-mode boundary blocks the core "compare engines" story.** `server.ts` hardcodes `shellMode: "grid"` for frame YAML, and `evaluatePreviewEngineCompatibility` hard-gates on `shellMode`. The force lane (`shellMode: 'force'`) can therefore never surface in a grid-shell switcher. User Story 1 ("switch between compatible engines for the same diagram") has no story for crossing the grid↔force shell boundary, which is precisely where multi-engine comparison would matter. This architectural gap is unaddressed and undocumented.

7. **Permissive hole in `requiredLayoutEngineKey` check.** The key only fails when `context.layoutEngine` is non-empty and mismatched; when a document has no `layout_engine` set, an engine that *requires* a specific key is still reported compatible. Document-kind is effectively the only real gate, making `requiredLayoutEngineKey` decorative for the (common) empty case.

8. **No round-trip test for the actual behavior.** Persistence tests prove the YAML *write*; the read path (`diagram.layoutEngine` → `__DG_CONFIG.layout_engine`) predates this spec. There is **no** test proving switch → persist → reload → engine resolves through the registry (T020). Success Criterion 3 ("persists cleanly without shadow state") is claimed but never validated as a round trip.

### Low-severity / hygiene

9. **Bookkeeping drift:** `tasks.md` T003 ("record example compatibility matrices") is `[ ]`, yet `plan.md` already contains both matrices. Status is ambiguous — either mark it done or remove the informal matrices.

10. **Tests are over-fit to the implementation, not spec behavior.** Several assert exact array order/indices and substring matches on author-written descriptions rather than user-observable behavior; AST tests use mock engines, not the real registry. None cover the P1/P2 user stories (no UI, no real incompatible-hidden case). Green ≠ feature-covered.

11. **Process deviation:** All work is **uncommitted on `main`'s working tree**, not on the `feat/035-compatible-engine-switcher` branch named in the spec. Risk of loss / unclear provenance. Spec Status remains "Draft".

### Recommended fixes (in priority order)

Status legend: `[x]` cleared in this pass (branch `feat/035-compatible-engine-switcher`,
commit `548bb4b`); `[ ]` deferred to the Phase 2 build (hand to Claude).

- [x] Do **not** mark spec 035 complete — it is Phase 1 only (spec Status stays Draft).
- [ ] **(Phase 2, Claude)** Wire the compatibility API into `server.ts`/the shell so the switcher actually lists compatible engines and rerenders (T010/T011). This is the feature.
- [x] Reject incompatible engine keys on persist — added a guard at the `/api/overrides/{slug}` write boundary (`normalizeLayoutEngine`/`hostableGridLayoutKeys`) instead of the low-level YAML writer (which would break the legitimate `vertical-stack`/`elk-force` metadata round-trip). Full document-kind gating still belongs in the Phase 2 switcher where the doc kind is known.
- [x] Stop claiming type-level support that does not exist — `plan.md` near-term matrix now marked "NOT yet representable" with the `PreviewDocumentKind` widening pre-req called out (FR-006).
- [x] Remove the dead AST-shape predicate engine (types/registry/index/tests) — YAGNI; documented how to reintroduce when a real engine needs it.
- [ ] **(Phase 2, Claude)** Decide and document how grid↔force shell-mode switching participates (or is explicitly out of scope) — currently it silently can't.
- [ ] **(Phase 2, Claude)** Add a true persist→reload→resolve round-trip test (T020).
- [ ] **(Phase 2, Claude)** Add T012 incompatible-engine UI test against the real registry.
- [x] Reconcile T003 checkbox vs the matrices in `plan.md`.
- [x] Commit the work to the `feat/035-compatible-engine-switcher` branch.

### Handoff to Claude (Phase 2)

Build the switcher itself: a manifest-driven dropdown that calls
`listPreviewEnginesWithCompatibility(context)` for the current document, offers only
compatible engines (disabled/hidden with `reason` for the rest), persists the choice via
the now-guarded `/api/overrides/{slug}`, and rerenders through `resolvePreviewEngine`
rather than bespoke shell paths. Resolve the grid↔force shell-mode question, add the
round-trip + UI tests (T012/T020), then come back for re-review. The Phase 1 contract,
persistence, and write-boundary guard are in place and green.


