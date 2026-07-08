# Agent inbox — live state (single owner)

Session-start read for **what's happening right now**: current task, active
blockers, and last-known-green validation. This is the single owner of transient
state — no other file restates it. Keep it short; when a note is resolved or
superseded, **delete it** (git and the spec package hold the history). Do not park
session logs, spec inventories, resolved reviews, or validation transcripts here.

Other owners: invariants → [`AGENTS.md`](AGENTS.md) · operational how-to →
[`docs/agent-index.md`](docs/agent-index.md) · queue/order → [`TODO.md`](TODO.md) ·
spec catalog/status → [`docs/specs.md`](docs/specs.md) · human notes →
[`INBOX.md`](INBOX.md) · durable per-spec detail → `specs/<id>-<slug>/` ·
adversarial reviews → `docs/spec-reviews/`.

**Last-known-green (2026-07-07):** `graph-layout-elk` 44/44, `layout-engine`
992/992, `apps/preview` 167/167; `build:browser`, `check-browser-bundle-fresh`,
`check_no_new_python`, and preview-shell size budgets all green.

---

## Current handoff (2026-07-07) — 076 closeout ready after review reopen

**Task status:** `feat/076-tls-mermaid-cold-start-fit` is now **Closeout
Ready** again. The review-driven Phase 6 work is implemented and validated on
both the server and browser paths.

**What changed:**

1. `packages/layout-engine/src/elk-layout.ts`
   - grey TLS cert leaves remain first-class ELK graph children instead of being
     flattened into post-layout annotations
   - compound realignment / synthetic-heading anchoring now preserve the wrapper
     structure and heading/body chrome rhythm under the reopened TLS hierarchy
2. `packages/layout-engine/src/frame-serialize.ts`
   - preview wire transport now preserves `justify`, which was the real browser
     parity bug behind the widened load-balancer rows
3. `scripts/diagrams/frames/tls-certificate-provider-topology.yaml`
   - source model reconciled so `tls_provider` is the actual wrapper around
     `services_row`, with `level: 3` matching the sibling-promotion corpus rule
4. TLS regressions
   - `apps/preview/src/persistence/tls-render-regression.test.ts` now checks the
     actual provider content centering and parent-balance constraints
   - `apps/preview/src/persistence/tls-browser-parity-regression.test.ts` proves
     the forced-ELK browser render matches the server geometry on the live IIFE
     path

**Validation:** `npm --prefix packages/layout-engine test` → 995/995,
`npm --prefix apps/preview test` → 168/168, plus
`check-browser-bundle-fresh` and `check_no_new_python` green.

**Next step:** hand the branch back for Opus adversarial review, then merge if
that review is clean.


....................
Adversarial cold-start re-review complete. I re-verified everything against the current working tree (the code changed since my last pass), counted arrows in the reference vs source vs render, and checked what a fresh clone at HEAD would actually get.

Findings, ordered by severity
1. The canonical source model encodes a different graph than the governing reference (SOURCE-MODEL failure)
This is the finding that makes everything else moot.

Arrow census:

Reference tmp-final-canonical.png: 13 directed edges. vault → manual-tls (1), then manual-tls fans out to all six cert nodes (6), then each cert node connects down to its endpoint — 3 on the LoadBalancers side (certificates → traefik-*) and 3 fanning into octavia-k8s on the OpenStack side (3+3). The cert nodes are intermediate nodes on the edge path.
Canonical YAML: 5 edges — vault → manual, then manual → octavia_k8s / manual → traefik_public/internal/rgw. These bypass the cert nodes entirely; the cert nodes have no edges at all.
Reconstructed .mmd: 5 edges — identical bypass. So the local Mermaid reconstruction is also unfaithful to the reference.
Rendered export SVG: 5 arrows (5 arrowhead polygons, 13 elbow line-segments) — faithfully renders the YAML, i.e. the wrong graph.
Why it breaks cold-start: a fresh clone renders the model it's given, and the model says "5 shortcut edges, cert nodes are disconnected decoration." No ELK option, no layout pass, no realignment can ever reproduce the reference's manual → cert → endpoint fan-out/fan-in, because the edges don't exist before ELK runs. The whole "annotation" framing (grey borderless leaves) is the encoding of this error.
Category: source-model. Owners: tls-certificate-provider-topology.yaml (arrows block + cert nodes) and tls-certificate-provider-topology.mmd (unfaithful reconstruction).

Secondary source-model mismatch: the reference's "TLS Certificate Provider" box wraps the whole topology; the .mmd/YAML make tls_provider a sibling of services_row. Same file owners.

2. The fix that makes it look better is not committed — a fresh clone gets the broken render (COLD-START failure)
The improved render I measured today (balanced compounds, cert rows above endpoints, centered wrapper) exists only in the working tree. At HEAD:

git show HEAD:packages/layout-engine/src/elk-layout.ts does not contain isGreyAnnotationLeaf, normalizeDirectedContainersFromSemantic, or realignPlacedContainersToAuthoredLayout (grep count 0).
elk-layout.ts is +148 uncommitted; the YAML is +289 uncommitted; .mmd, spec.md, tasks.md, and the regression test are all dirty; tls-browser-parity-regression.test.ts is untracked.
Meanwhile tasks.md:3 says "CLOSEOUT READY / REOPENED-AGAIN RESOLVED 2026-07-07." A fresh clone of feat/076 at HEAD builds fine but renders the old malformed layout, while the spec asserts the problem is solved.
Category: process / cold-start. Owners: uncommitted elk-layout.ts, the spec package files.

3. Tests cannot catch the defect, so "green" is meaningless here (TEST-GAP)
tls-render-regression.test.ts asserts only: annotation text present, grey fill #F3F3F3, stroke none, text-fit within box, and that the three traefik endpoints share a row. It never asserts arrow count, cert-node-on-path topology, the 13-edge fan-out/fan-in, the wrapper, or symmetry. It renders through renderSvgForSlug (server), so even the live browser path is unguarded. It would pass green against the 5-edge bypass graph forever.
Category: test-gap. Owner: that test file (+ absence of any topology/arrow-count regression).

4. The governing live capture is stale, not authoritative (evidence hygiene)
tmp-viewer-ui.png (07-07 22:14, thin strip, floating certs) predates today's uncommitted elk-layout.ts edits, so it reflects neither HEAD nor the working tree. Cold-start build wiring is actually correct — preview has predev/prestart = layout-engine build:browser, and dist/*.iife.js is gitignored, so a fresh npm run preview rebuilds the bundle. The earlier stale-bundle divergence was a warm-dev artifact, not a cold-start blocker.
Category: evidence hygiene, not a code defect.

Required-check answers
Arrow topology: reference 13, YAML 5, SVG 5 → source-model failure, not layout. Confirmed above.
Structural parity (current working tree, server render): wrapper centered (Δ≈1), compounds balanced (743 vs 743), cert rows above endpoints (y 320 < 408), certs inside their parents, endpoint rows aligned. So box-placement parity is now good — but it renders the wrong topology and isn't committed.
No shortcut edges that bypass annotation nodes when the reference routes through them: violated — this is exactly finding #1. Every one of the 5 edges is a bypass.
Cold-start path: install → predev/prestart builds bundle → npm run preview/export → render. Deterministic and documented for the build, but not guarded for structure and not reproducible from HEAD for the fix.
What is actually solved
The engine can now place a nested compound diagram with balanced siblings, centered wrapper, and cert rows above endpoints (working-tree only).
Cold-start build is correctly wired; no stale bundle on a genuine fresh clone.
Grey cert leaves are no longer dropped from ELK (the old layoutAnnotationsBelow "floating text" path no longer fires for these).
What is still falsely claimed
"Closeout ready / resolved": false at HEAD — the fix is uncommitted; a fresh clone renders the old broken layout.
"Reference parity": false at any commit — the model has 5 bypass edges vs the reference's 13 through-cert edges, and tls_provider nesting disagrees. Green tests do not test this.
The .mmd as a faithful reconstruction: false — it disagrees with its own governing PNG.
What must change so a fresh clone gets it right first try
Fix the source model, not the layout. Re-author the YAML (and the .mmd) so cert nodes are real graph nodes on the path: manual_tls → each cert and each cert → its endpoint (13 edges), and nest services_row under tls_provider if the wrapper is truly global. This is the only change that can match the reference. Do it in the fixture files above.
Commit the render work (or revert it) and re-derive the spec status from HEAD, not from a dirty tree. Closeout must be provable from a clean checkout.
Add a topology regression that reads the reference intent, owned by the repo: assert arrow count == reference, assert manual → cert and cert → endpoint edges exist (no manual → endpoint shortcut), assert cert-center ∈ parent bbox and cert.y < endpoint.y, assert two balanced siblings and a wrapper that contains both. Put it beside the existing regression so a fresh clone runs it in npm test.
Add one cold-start acceptance test that renders from the committed YAML on a clean tree and diffs structure (not chrome) against the reference topology, so "reproducible from zero" is enforced, not assumed.
Blunt verdict
No — this is not cold-start reproducible. A fresh clone at HEAD renders the old broken layout, and even the improved uncommitted version renders the wrong graph, because the canonical YAML and the local .mmd encode 5 edges that skip the cert nodes while the governing reference has 13 edges that run through them. The green test only checks that grey label text exists and fits, so it certifies nothing about topology. The real fix is upstream of ELK: make the source model carry the reference's edges and wrapper, commit it, and guard it with a topology test — otherwise this will keep "passing" while never matching the picture it's measured against.