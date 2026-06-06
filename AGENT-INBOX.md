# Agent Inbox

Machine-generated handoffs, long diagnostics, and cross-repo follow-up notes go here.

Do not use this file for user notes. User-authored async notes belong in `INBOX.md`.

The agent should triage anything durable from this file into `TODO.md`, `STATUS.md`, `HISTORY.md`, or `docs/specs.md`, then empty this file back to this header template.

---

## Composer prompt — simple force fixes from user inbox (2026-06-06)

**Executor:** composer

**Scope:** fix the two simple force-preview bugs below only. Do not start spec 024 ELK work and do not draft the new cross-engine align/distribute spec in this pass.

### Bugs to fix

1. **Multi-select unpin should apply to every selected force node.**
2. **Unpinned force nodes revert to pinned after Save/Reload.** Saving should persist the unpinned state instead of restoring old pinned flags.

### Expected routing

- These are **force-preview** fixes, not ELK work.
- Keep changes minimal and local to the force preview/runtime/save path.
- Do not widen scope into generic selection UX or new spec writing.

### Likely files

- `scripts/preview/force.js`
- `packages/layout-engine/src/force-runtime.ts`
- any force save/persistence helper touched by the current save flow

### Requirements

- Preserve current single-node unpin behavior.
- Multi-select unpin must update all selected nodes in one action.
- Save → reload must preserve the unpinned state.
- Add focused tests for both regressions.

### Validation

Run at minimum:

```bash
npm --prefix packages/layout-engine test -- tests/force-runtime.test.ts
python -m pytest scripts/test_preview_force_api.py -q
```

If preview-shell code changes materially, add the narrowest extra focused test you need.

### Report-back instruction

After you finish:

1. Replace this prompt section with a short report containing:
	- files changed
	- commands run
	- pass/fail
	- any residual risks
2. Append a new section titled **Adversarial review request — force unpin fixes** asking the next agent to review only these two bugs and their tests.
3. Do not leave old prompt text alongside the report.

### Adversarial review request template to append after completion

```md
## Adversarial review request — force unpin fixes

Review the just-landed force-preview fixes for:

- multi-select unpin applying to every selected node
- unpinned state persisting across Save/Reload

Check the changed files, run the focused validation commands listed above, and look for save-path drift or selection-state edge cases. Findings first, ordered by severity.
```
