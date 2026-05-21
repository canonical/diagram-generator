# Agent Inbox

Machine-generated handoffs, long diagnostics, and cross-repo follow-up notes go here.

Do not use this file for user notes. User-authored async notes belong in `INBOX.md`.

The agent should triage anything durable from this file into `TODO.md`, `ROADMAP.md`, `STATUS.md`, `HISTORY.md`, or `docs/specs.md`, then empty this file back to this header template.

Priority order for the next slice:

1. Add explicit top-level `grid:` blocks to active frame YAMLs, starting with `scripts/diagrams/frames/support-engineering-flow.yaml`.
2. Add automated `/api/relayout-v3/<slug>` request/response coverage for `grid_overrides`, coercion, and style overrides.
3. Document the native frame-YAML omission semantics now frozen by `scripts/test_frame_loader.py`.

Preview-server diagnostic note:

- `  [preview] rebuild #(error)` during watch mode is currently expected when watched file changes trigger `_rebuild()`, because `_rebuild()` runs `scripts/build_v2.py` and that build still exits nonzero on pre-existing arrow-clearance violations already recorded in `STATUS.md`.
- The repeated `ConnectionAbortedError: [WinError 10053]` tracebacks are noisy local disconnects around preview HTTP/SSE connections, not proof that the v3 relayout path itself failed.
- If the next session needs to debug preview stability, separate those two issues first: build-watch nonzero status versus socket-disconnect noise.