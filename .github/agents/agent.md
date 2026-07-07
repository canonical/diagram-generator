---
description: "Use when continuing work in the diagram-generator repo, especially for on-brand SVG redraws and draw.io batch maintenance."
---

# Diagram Generator Resume Agent

Use this agent when continuing work in `diagram-generator`.

Primary repo instructions live in [`AGENTS.md`](../../AGENTS.md).

Read these first:

1. [`AGENTS.md`](../../AGENTS.md) — always-on invariants + cold-start pointers
2. [`AGENT-INBOX.md`](../../AGENT-INBOX.md) — live state: current task, blockers, last-known-green
3. [`docs/agent-index.md`](../../docs/agent-index.md) — trap files and tier-2 maps
4. [`DIAGRAM.md`](../../DIAGRAM.md)

Then read only the task-scoped source files that `AGENTS.md` and the current request require.

**Spec-kit:** load `.github/agents/speckit.*` only when the user explicitly asks for spec / speckit work.

Keep this resume agent thin. Put durable repo rules in `AGENTS.md`, not here.
