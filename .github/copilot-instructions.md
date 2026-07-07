# Workspace Instructions

Primary repo instructions live in [`AGENTS.md`](../AGENTS.md).

Use `AGENTS.md` for always-on invariants and cold-start pointers. Live state/handover lives in [`AGENT-INBOX.md`](../AGENT-INBOX.md); operational how-to (validation, search hygiene, trap files) in [`docs/agent-index.md`](../docs/agent-index.md). Do not duplicate repo-specific rules here.

<!-- SPECKIT START -->
Load `.github/agents/speckit.*`, `.github/prompts/speckit.*`, and `specs/*/plan.md` **only** when the user explicitly requests spec-kit work.
For normal bugfixes: read `docs/agent-index.md` + `AGENTS.md` + task-scoped source files.
Spec index: `docs/specs.md` — open one package at a time.
<!-- SPECKIT END -->
