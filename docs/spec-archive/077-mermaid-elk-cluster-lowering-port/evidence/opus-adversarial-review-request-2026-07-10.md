# Opus adversarial review request — spec 077 TLS topology

Reviewer: Opus
Branch: `feat/077-mermaid-elk-cluster-lowering-port`
Requested: 2026-07-10

Write the review to:

`docs/spec-reviews/077-mermaid-elk-cluster-lowering-port-adversarial-review-2026-07-10.md`

After writing the review, update `AGENT-INBOX.md` with a link to that review and a
short health/readiness-to-merge summary. Remove any completed/stale inbox notes
you supersede. Do not revert or stage unrelated dirty files, especially root
`image copy*.png`, `apps/preview/tmp-current-tls.png`, or
`specs/077-yaml-drawio-export/golden/*.drawio`.

## Read First

- `AGENTS.md`
- `AGENT-INBOX.md`
- `docs/agent-index.md`
- `DIAGRAM.md`
- `docs/spec-archive/077-mermaid-elk-cluster-lowering-port/spec.md`
- `docs/spec-archive/077-mermaid-elk-cluster-lowering-port/tasks.md`
- `docs/spec-archive/077-mermaid-elk-cluster-lowering-port/handoff.md`
- `docs/spec-archive/077-mermaid-elk-cluster-lowering-port/evidence/tls-raw-styled-parity.md`

## Review Scope

Do an adversarial review of the entire branch, not just the last diff. Findings
first, ordered by severity, with file/line references. If no finding exists in an
area, say that explicitly and list residual risk.

Pay particular attention to automatic role selection:

- Verify role assignment is configured through `meta.frame_roles`, generic, and
  not keyed to TLS ids.
- Verify synthesized `level` is the semantic authority for both rendering and the
  preview variant dropdown.
- Verify section/parent/highlight/annotation/child styling comes from the frame
  class system and `resolveStyles`, not local per-fixture mutations.
- Verify the TLS top compound is a section and the two lower root compounds are
  parents without explicit TLS `level:` fields.

Also review:

- Raw ELK vs styled product parity for visible frame x/y/width/height, label
  x/y/width/height, arrow paths, shared fan-out stem, and lower-row equal heights.
- No post-ELK geometry ownership on cluster-lowered diagrams except the approved
  generic endpoint-border trim.
- No fixture-keyed code in `packages/` for TLS, OpenStack, Octavia, Traefik, or
  manual TLS certificate ids.
- ELK edge labels use the annotation class contract only: transparent fill, no
  stroke, regular `#666666` text, annotation padding/alignment, and no grey pills
  or centered bespoke label boxes.
- The typed ELK option registry and YAML options are enough to explain the fan-out
  fix; there should be no route/path hardcoding.
- The preview controls still work for orientation and ELK option overrides, and
  browser bundle freshness is maintained.

Open-ended ELK question:

Given the remaining complaints that drove this branch, which, if any, ELK
parameters should be promoted to better defaults or stronger typed controls for
future diagrams? Specifically consider common-source fan-out, hierarchy-edge
merge, model order, label spacing/order, compound sizing/equal-height behavior,
and bottom-row parent alignment. If none should become broader defaults, explain
why and what evidence supports keeping them opt-in or graph-shape scoped.

## Expected Output

The review should include:

- Blocking findings.
- Non-blocking findings.
- Tests or validations run, and anything not run.
- Health/readiness-to-merge assessment.
- Whether spec 077 still needs T051/T054 before closeout.
- Recommended follow-up specs if a concern is real but out of scope.
