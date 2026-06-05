# Agent Inbox

Machine-generated handoffs, long diagnostics, and cross-repo follow-up notes go here.

Do not use this file for user notes. User-authored async notes belong in `INBOX.md`.

The agent should triage anything durable from this file into `TODO.md`, `STATUS.md`, `HISTORY.md`, or `docs/specs.md`, then empty this file back to this header template.

## 2026-06-05 — auto-mode prompts for the next heavy slice

### Prompt 1 — `[H]` spec 020 corpus pruning orchestrator

You are continuing work in `diagram-generator` on spec 020. The just-finished slice removed the last live `stack_gap` compatibility path from TS heading synthesis, the preview bridge/persistence path, and the legacy Python loader tests. The repo rule is now explicit: do not add speculative compatibility shims for retired contracts.

Your task is to execute the next heavy slice: **prune the frame YAML corpus down to a minimal invariant pack**.

Requirements:

1. Read `.github/copilot-instructions.md`, `STATUS.md`, `TODO.md`, `DIAGRAM.md`, and `specs/020-lean-variant-style-authority/spec.md` first.
2. Treat this as a spec-020 simplification task, not an archival exercise. The goal is a small canonical fixture pack that still protects the engine invariants.
3. Keep only slugs that each justify their existence with at least one distinct invariant. Delete redundant fixtures or rewrite them into a smaller canonical set.
4. Before deleting anything, check for references in tests, scripts, docs, preview affordances, and exported outputs. Update references in the same slice.
5. Do not preserve fixtures just because they existed historically. This repo optimizes for a lean test corpus, not backwards compatibility.
6. Prefer TypeScript-facing validation. Python legacy parity is not a blocker unless the fixture is still genuinely needed for batch/export correctness.

Deliverables:

1. A reduced invariant-pack corpus under `scripts/diagrams/frames/`.
2. Updated tests/docs/reference lists so no deleted slug is still referenced.
3. `TODO.md` progress updated for spec 020.
4. `HISTORY.md` entry only if the slice is truly complete.

Validation:

1. Run focused searches proving deleted slugs have no live references.
2. Run targeted TS validation for any touched slugs or tests.
3. Export all kept canonical slugs through `node packages/layout-engine/scripts/export-frame-svg.mjs --slug <name>` or a tight scripted equivalent.
4. Report exactly which slugs were kept, deleted, or rewritten, and which invariant each kept slug protects.

### Prompt 2 — `[H]` spec 020 semantic-YAML rewrite after pruning

You are continuing `diagram-generator` immediately after the invariant-pack pruning slice. Work only from the surviving canonical fixtures.

Your task is to execute the next heavy slice: **rewrite the remaining YAML toward semantic inputs only**.

Requirements:

1. Read `.github/copilot-instructions.md`, `STATUS.md`, `TODO.md`, `DIAGRAM.md`, and `specs/020-lean-variant-style-authority/spec.md` first.
2. Remove retired style escape hatches from the kept YAML corpus where the runtime already derives the result semantically.
3. Prefer deletion over compatibility. If a field no longer represents real authored intent, remove it instead of translating it forward.
4. Keep explicit YAML only where it expresses a real structural or semantic exception.
5. Do not reintroduce UI or loader compatibility paths for fields this spec is trying to erase.

Deliverables:

1. A semantically rewritten invariant-pack corpus.
2. Any necessary focused test updates.
3. `TODO.md` updated to reflect what remains after the semantic rewrite.

Validation:

1. Grep the kept corpus for retired escape-hatch fields and report what remains.
2. Run focused TS tests that cover the touched semantics.
3. Export the kept canonical slugs and verify no regressions.

### Prompt 3 — `[X]` validation audit after prompts 1 and 2

Run a read-only validation audit on the finished spec-020 pruning and semantic-rewrite work.

Checklist:

1. Search for deleted slug references across tests, scripts, docs, and preview code.
2. Search the kept YAML corpus for retired style escape hatches and unnecessary explicit spacing/padding fields.
3. Report pass/fail only; do not edit files.
4. Call out any place where compatibility code or compatibility-minded wording was reintroduced.
