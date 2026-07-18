# Opus adversarial follow-up request — spec 080 Phase 7 remediation

Review the remediation of your `CHANGES REQUESTED` findings N-H1, N-M1, N-M2,
N-L1, N-L2, and N-L3. Treat the checked T070–T075 tasks and updated capability
matrix as claims to falsify.

## Mandatory workspace and output

- Worktree:
  `H:\WSL_dev_projects\diagram-generator-worktrees\080-renderable-interchange-import`
- Branch: `feat/080-renderable-interchange-import`
- Remediation base: `4e0a032`
- Review delta: `git diff 4e0a032...HEAD`
- Prior findings:
  `docs/spec-reviews/opus-adversarial-review-findings-2026-07-18-spec-080-implementation.md`

**Do not leave the review in chat.** Write the complete follow-up verdict and
findings to this exact file:

`H:\WSL_dev_projects\diagram-generator-worktrees\080-renderable-interchange-import\docs\spec-reviews\opus-adversarial-review-findings-2026-07-18-spec-080-phase-7-remediation.md`

Create the file even when the verdict is `APPROVE`; chat should contain only a
short pointer.

## Required probes

1. Verify unquoted one-word and multi-word Mermaid labels for `-- … -->`,
   `== … ==>`, and `-. … -.->`, including chains, quoted/pipe regressions,
   malformed/missing closers, comments, and bounded-input behavior.
2. Verify bare `flowchart` and `graph` default exactly to `TB`, serialize/reload
   correctly, and do not make malformed multi-token headers permissive.
3. Verify implicit D2 endpoints for simple edges and chains, deduplication,
   first-seen order, labels, declared-later nodes, and nested blocks. Specifically
   try to disprove that implicit endpoints stay in the block containing the
   connection. Dotted unresolved endpoints must still block rather than invent
   containment.
4. Verify conflicting explicit inline labels produce a bounded, named visual
   diagnostic stating the retained and dropped values. Probe repeated identical
   labels, three-way conflicts, declaration order, and strict/non-strict modes.
5. Verify `o--o` and `x--x` preserve both endpoints and one arrow, report only a
   named visual decoration downgrade, and do not interfere with adjacent ids or
   the ordinary connector tokenizer.
6. Verify every corpus fixture requires both provenance headers. When the
   external read-only Mermaid corpus exists, recompute all three SHA-256 hashes
   from exact bytes; when it does not, confirm only the external lookup is
   skipped—not missing/malformed headers.
7. Audit the revised matrix rows MF-01a, MF-09a, MF-36, D2-03/03a, and D2-06,
   plus the passing-test index, spec success criterion, tasks, validation,
   catalog, queue, and inbox. Flag any optimistic wording.
8. Re-check that the remediation adds no behavior-heavy legacy JavaScript,
   Python product logic, unsafe writes, false-success paths, or unrelated files.
   The untracked user YAML files `baseline.yaml` and
   `dmb-manage-packagesets.yaml` are outside the remediation commit and must not
   be treated as implementation artifacts.

Run at minimum:

```powershell
npm --prefix packages/layout-engine test
npm --prefix packages/layout-engine run build:browser
npm --prefix apps/preview test
npm --prefix apps/preview run build
npm run clean:src-artifacts
node scripts/check-browser-bundle-fresh.mjs
node scripts/check_no_new_python.mjs
git diff --check 4e0a032...HEAD
```

The findings file must include branch/base verification, verdict (`APPROVE`,
`CHANGES REQUESTED`, or `IMPORT-BLOCKING`), a T070–T075 resolution table,
findings ordered by severity with reproductions and exact file/line evidence,
validation counts, residual risks, and merge recommendation. Do not implement
product-code fixes during the review.
