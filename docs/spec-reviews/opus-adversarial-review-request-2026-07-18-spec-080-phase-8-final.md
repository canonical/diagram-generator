# Opus final review request — spec 080 Phase 8

Perform a narrow final adversarial review of the fixes for your addendum findings
N-H2 and N-L4 and the working-tree hygiene blocker.

## Mandatory workspace and output

- Worktree:
  `H:\WSL_dev_projects\diagram-generator-worktrees\080-renderable-interchange-import`
- Branch: `feat/080-renderable-interchange-import`
- Review base: `72aff38`
- Review delta: `git diff 72aff38...HEAD`
- Prior findings/addendum:
  `docs/spec-reviews/opus-adversarial-review-findings-2026-07-18-spec-080-implementation.md`

**Do not leave the verdict only in chat.** Write the complete final review to:

`H:\WSL_dev_projects\diagram-generator-worktrees\080-renderable-interchange-import\docs\spec-reviews\opus-adversarial-review-findings-2026-07-18-spec-080-phase-8-final.md`

Create that file even for `APPROVE`; chat should contain only a short pointer.

## Required probes

1. Verify `A-->B`, `a-->b-->c`, `a---b`, `my-node-->other-node`, and
   `a.b-->c.d` tokenize and import with exact ids, nodes, edge order, and
   multiplicity. Probe adjacent connector-like punctuation so the boundary fix
   does not truncate valid ids or accept malformed edges.
2. Verify solid/thick/dotted unquoted labels with and without spaces. In
   particular, `a -. maybe .-> b` must preserve one labelled arrow and emit only
   a visual edge-style downgrade; both `.->` and the compatibility `-.->`
   closers must remain covered.
3. Confirm malformed/missing closers still block and the shared no-write /
   no-false-success safety contract is unchanged.
4. Audit matrix rows MF-08/08a and MF-12a, T076/T077, spec/plan status,
   validation, catalog, queue, and inbox for accurate wording and real proofs.
5. Confirm `baseline.yaml` and `dmb-manage-packagesets.yaml` are gone, no
   unrelated files are staged or untracked, and the review delta contains only
   the Phase 8 fix plus required bookkeeping/review records.

Run:

```powershell
npm --prefix packages/layout-engine test
npm --prefix packages/layout-engine run build:browser
npm --prefix apps/preview test
npm --prefix apps/preview run build
npm run clean:src-artifacts
node scripts/check-browser-bundle-fresh.mjs
node scripts/check_no_new_python.mjs
git diff --check 72aff38...HEAD
git status --short
```

The on-disk review must include branch/base verification, verdict (`APPROVE`,
`CHANGES REQUESTED`, or `IMPORT-BLOCKING`), a T076/T077 resolution table,
findings with exact reproductions and file/line evidence, validation counts,
working-tree status, and an explicit merge recommendation. Do not implement
product-code fixes during the review.
