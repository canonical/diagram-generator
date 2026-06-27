# Agent inbox

Machine-generated handoffs and diagnostics go here.

Durable follow-up belongs in `specs/<id>-<slug>/`,
[`AGENTS.md`](AGENTS.md#handover), or [`docs/specs.md`](docs/specs.md).
`TODO.md` is only a pointer to open spec packages.

---

## 2026-06-26 - Spec 052 live engine-switch regressions resolved

The 2026-06-25 deeper review item is complete. Phase 6 in
`specs/052-layout-engine-onboarding-port/tasks.md` now records the fixes and
verification:

- explicit incompatible engine choices no longer silently degrade to v3;
- `elk-layered` is compatible with compound/container-endpoint frame fixtures;
- authored ELK -> v3 save/reload persists for `juju-bootstrap-machines-process`;
- `service-handshake-sequence` resolves/renders through the sequence engine and
  sizes notes/participants from text;
- full layout-engine and preview-app suites, no-new-Python, browser-bundle
  freshness, and a no-screenshot live probe are green.

No open agent-inbox items remain. Spec 051 right-aside UI cleanup remains
separately tracked in `docs/specs.md`.
