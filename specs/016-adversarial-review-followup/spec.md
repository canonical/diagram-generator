# Spec 016 – Adversarial review follow-up (preview TS paths)

**Branch**: `feat/005-autolayout-hardening` (or `feat/016-adversarial-review-followup`)  
**Created**: 2026-06-03  
**Status**: Complete  
**Input**: `AGENT-INBOX.md` — adversarial review on `feat/005-autolayout-hardening`

## Mission

Close P1–P3 findings from the post-session adversarial review so preview save/reload roundtrips and concurrent API calls behave correctly under isolated test frames dirs.

## Findings addressed

| Sev | Finding | Fix |
|-----|---------|-----|
| P1 | Node preview/export scripts ignored `DG_FRAMES_DIR` | Centralize frame path resolution in `_dist-import.mjs` (`framesDir()`); use in all slug-based CLIs |
| P2 | `TsLayoutPool` lacked in-flight coalescing | Port `_inflight` pattern from `TsSvgExportPool` for `layout_bundle` and `frame_tree_json` |
| P3 | Force mode wired diagram picker twice | Remove duplicate listener in `force.js`; `editor-base.js` owns picker + prev/next |

## Success criteria

- `test_v3_style_save_roundtrip_uses_yaml_baseline` and `test_v3_per_side_padding_updates_live_and_persists` pass with TS preview paths
- Regression test: Node emit honors `DG_FRAMES_DIR`
- `test_coalesces_concurrent_requests` on `TsLayoutPool` passes
- `npm test` and preview pytest bundle green

## Non-goals

- Branch split / rename (documented in inbox; manual hygiene)
- Frame delete in preview editor (separate inbox item)
