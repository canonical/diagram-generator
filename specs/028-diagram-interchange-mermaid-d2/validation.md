# Validation — Mermaid-first hand-authored import

Validated 2026-07-17 on `feat/028-diagram-interchange-mermaid-d2`, including a
full post-rebase run before the clean fast-forward merge to `main`.

## Review remediation

| Finding | Disposition |
|---------|-------------|
| F1 empty/hand-authored imports | Implicit nodes, chains, node shapes, CLI empty guards, and hand-authored regressions landed. |
| F2 invalid YAML / duplicate ids | Shared structural diagnostics now surface as import errors; the synthetic root avoids imported ids; both CLIs recompile before writing. |
| F3 D2 chains | Documented as deferred without broadening the D2 grammar. |
| F4 Copy overrides regression | `#btn-export` restored; obsolete per-format button listeners/sync helpers removed. |
| F5 optional D2 compiler | Opt-in status documented; real gate passed with `C:\Program Files\D2\d2.exe`. |
| F6 missing tests | Duplicate ids, implicit nodes, chains, shapes, type guards, and process-level CLI failures are covered. |
| F7 historical review | Earlier review retained with a superseded banner and corrected stale status. |

## Corpus conversions

| Source | Output | Frames | Arrows | Diagnostics |
|--------|--------|-------:|-------:|-------------|
| `support-flowchart.mmd` | `mermaid-support-flowchart.yaml` | 6 | 3 | 19 unsupported-style warnings |
| `mongo-octavia-ha.mmd` | `mermaid-mongo-octavia-ha.yaml` | 13 | 7 | 26 unsupported-style warnings |
| `707a041175dc9abe-lifecycle-details.mmd` | `mermaid-lifecycle-details.yaml` | 25 | 24 | 39 unsupported-style + 7 shape-downgrade warnings |

All three compile with zero errors, carry explicit sibling-promotion levels, are
listed by the preview index, and return `200` frame documents through
`/api/preview-document/<slug>` (3, 7, and 24 arrows respectively).

The medium conversion preserves the source Mermaid topology (13 frames, 7
arrows). The existing hand-authored `mongo-octavia-ha.yaml` is intentionally
richer (18 frames, 4 arrows): it introduces structural grouping and presentation
labels that are not present in the Mermaid source.

The real Sankey, pie, and sequence corpus files each exit non-zero with exactly
one `IMPORT_MERMAID_UNSUPPORTED_DIAGRAM_TYPE` message naming `sankey-beta`,
`pie`, or `sequenceDiagram`.

The in-app browser surface was unavailable during validation, so no claim is
made about a manual visual inspection. Product-path evidence is the live preview
host document load plus the complete preview browser regression suite.

## Green commands

- `npm --prefix packages/layout-engine test` — 170 files, 1,054 tests after rebase.
- `npm --prefix apps/preview test` — 174 tests after rebase.
- `D2_BIN="C:\Program Files\D2\d2.exe" npm --prefix packages/layout-engine test -- tests/diagram-author-export-d2.test.ts` — 9 tests.
- `node scripts/check-browser-bundle-fresh.mjs`.
- `node scripts/check_no_new_python.mjs`.
- `git diff --check`.
