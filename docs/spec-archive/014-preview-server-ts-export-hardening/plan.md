# Plan: Spec 014

1. Extract `scripts/preview_ts_export.py` — cache, semaphore, in-flight coalescing, subprocess wrapper
2. Wire `preview_server._render_svg_via_ts` through pool; centralize `_serve_v3_svg_bytes` fallback
3. Invalidate cache on rebuild / YAML save (share slug mtime key)
4. Improve `_rebuild` / `_watch_loop` logging
5. Add `scripts/test_preview_ts_export.py`
6. Update `docs/specs.md`, mark tasks complete
