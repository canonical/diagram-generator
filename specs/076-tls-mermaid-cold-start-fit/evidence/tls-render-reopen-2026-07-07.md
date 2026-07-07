# 2026-07-07 Reopen Closeout Evidence

| Asset | Role |
|------|------|
| [`../images/01-source-mermaid-reference.png`](../images/01-source-mermaid-reference.png) | Mermaid reference image inside this spec package |
| `H:\WSL_dev_projects\mermaid-wt-076-tls\tmp-final-canonical.png` | Sister-repo Mermaid/ELK harness cross-check |
| [`tls-render-reopen-baseline.svg`](./tls-render-reopen-baseline.svg) | Fresh product-path broken baseline captured for T050 |
| [`tls-render-reopen-fixed.svg`](./tls-render-reopen-fixed.svg) | Fresh product-path render after the Phase 5 fixes |

Parity checkpoints against the reference:

- Annotation leaves now render as grey boxes with both authored lines, including the literal `interface: tls-certificates` second line.
- The load-balancer endpoints `traefik_public`, `traefik_internal`, and `traefik_rgw` now share one horizontal row instead of stair-stepping downward.
- The OpenStack relation row stays above `octavia_k8s`.
- The certificate/interface labels fit inside their rendered boxes without truncation-driven wrapping.

Repo-owned validation used for the reopen closeout:

- `npm --prefix packages/layout-engine test -- elk-layout.test.ts resolve-styles.test.ts diagram-author-lower.test.ts`
- `npm --prefix apps/preview test`
