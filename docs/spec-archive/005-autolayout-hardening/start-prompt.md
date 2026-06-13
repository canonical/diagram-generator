# Spec 005: Autolayout hardening — cold-start prompt

Use this prompt to start a fresh agent session on spec 005.

---

## Prompt

You are working in `diagram-generator`. Your task is **spec 005: autolayout hardening** — eliminating semantic Frame tree mutation during layout.

### Context (read these first)

1. `STATUS.md` — repo orientation, project context (Jira DE-941 / Stream E)
2. `.github/copilot-instructions.md` — TS-first mandate, anti-patch protocol
3. `specs/005-autolayout-hardening/spec.md` — what and why
4. `specs/005-autolayout-hardening/plan.md` — how (4 workstreams)
5. `specs/005-autolayout-hardening/tasks.md` — 24 tasks across 6 phases

### The problem

The layout engine mutates the semantic Frame tree during layout:
- `col_span` resolution rewrites `frame.width` and `frame.sizing_w`
- FILL/HUG coercion rewrites parent sizing fields
- Root width is saved/mutated/restored fragily

This means running layout twice can produce different results, and the Frame tree after layout is not the same tree the user authored. Layout should compute derived geometry without touching semantic fields.

### Engine rule — read carefully

**All changes target TypeScript first:** `packages/layout-engine/src/layout.ts` and `packages/layout-engine/src/frame-model.ts`. Python `scripts/layout_v3.py` receives equivalent changes only for parity verification afterward. Do not start work in Python.

### Validation

```bash
npm --prefix packages/layout-engine test                                          # TS (primary)
python -m pytest test_frame_loader.py test_autolayout.py test_layout_v3.py test_parity.py -q  # Python parity
```

After any layout change, render all frame YAMLs and browser-verify high-risk diagrams.

### Start with Phase 1

Begin with T001 (capture baseline) and T002 (inventory all semantic mutations in `layout.ts`). Understand the mutation surface before changing anything.
