# Adversarial review: D2 exporter (spec 022 phase 8)

**Reviewed**: 2026-06-06  
**Scope**: `export-d2.ts`, `export-d2.mjs`, `diagram-author-export-d2.test.ts`, docs  
**PoC artifact**: `../d2/juju-bootstrap-machines-process.d2` (+ rendered SVG)

## Verdict

The exporter is a **usable v1 adapter** for nested containers, multiline labels, and labeled arrows. It compiles under D2 v0.7.1 for the juju bootstrap fixture. Several **silent-loss** and **doc-drift** issues should be addressed before treating interchange as production-ready; full import/round-trip belongs in spec **028**.

---

## P1 — Correctness / silent data loss

| ID | Finding | Evidence | Recommendation |
|----|---------|----------|----------------|
| D2-01 | **Missing arrow endpoint → empty D2 path with no diagnostic.** | `export-d2.ts` `buildD2Path`, no guard in `renderArrow` | **Fixed 2026-06-06**: `D2_MISSING_FRAME_REF`; edge omitted. |
| D2-02 | **Unquoted labels can break D2 compilation.** `formatMultilineLabel` emits bare tokens when `/^[\w .-]+$/` matches. Most corpus labels pass, but authored punctuation (`:`, `{`, `|`, `@`, unicode) can produce **valid-looking exporter output that D2 rejects**. PoC hit this with literal newlines inside `"..."` (fixed); unquoted edge cases remain untested in CI. | `formatMultilineLabel`; no `d2 compile` in tests | Prefer quoting whenever label ≠ safe identifier, or add golden `d2 compile` step in tests. |
| D2-03 | **Arrow `style`, `color`, and `label_gap` dropped silently.** | `renderArrow` only checks waypoints/anchors | **Fixed 2026-06-06**: `D2_UNSUPPORTED_ARROW_STYLE`. |

---

## P2 — Spec / contract drift

| ID | Finding | Evidence | Recommendation |
|----|---------|----------|----------------|
| D2-04 | **`docs/specs.md` still says “D2 export deferred”.** | Row for spec 022 | **Fixed 2026-06-06**; spec 028 row added. |
| D2-05 | **Spec 022 US6 acceptance partially unmet.** US6 says icons included “where D2 supports it”; implementation **always** warns `D2_UNSUPPORTED_ICON` and never maps repo icon paths to D2 `icon:` URLs. | `collectFrameWarnings` | Document as intentional v1 limitation in spec 022 closeout, or track icon URL mapping in spec 028. |
| D2-06 | **`data-model.md` D2 section is thin.** | `data-model.md` § D2 export model | **Fixed 2026-06-06**: warning code table added. |
| D2-07 | **Container `heading` + `label` both set → label wins silently.** | `formatNodeLabel` | **Fixed 2026-06-06**: `D2_AMBIGUOUS_CONTAINER_LABEL`. |

---

## P2 — Design / maintainability

| ID | Finding | Evidence | Recommendation |
|----|---------|----------|----------------|
| D2-08 | **`UNSUPPORTED_LAYOUT_FIELDS` duplicated** in `export-mermaid.ts` and `export-d2.ts`. Future frame fields will drift. | Both exporters | Extract shared `collectLayoutExportWarnings()` in a small shared module (spec 028 or 022 follow-up). |
| D2-09 | **ELK `vars` block is coarse.** Any `meta.layout_engine` containing `"elk"` emits `layout-engine: elk` only; ignores `meta.elk` tuning present in juju YAML and the hand-crafted `juju-4-architecture.d2` PoC (`sketch`, direction, spacing). | `renderD2Config` | v1 OK; spec 028 should define optional mapping table YAML meta → `d2-config`. |
| D2-10 | **Fully qualified arrow paths always.** Correct for D2, but verbose (`row_main.juju_system.client`). Short ids work when globally unique; exporter never shortens. | juju `.d2` output | Optional readability pass in v2; not a bug. |
| D2-11 | **Page wrapper omitted; sibling export roots are flat top-level shapes.** Same strategy as Mermaid. Loses synthetic `page` grouping — acceptable for layout tools, worth documenting in interchange matrix. | `exportRoots` logic | Document in spec 028 fidelity matrix. |

---

## P3 — Testing / ops gaps

| ID | Finding | Evidence | Recommendation |
|----|---------|----------|----------------|
| D2-12 | **No CI invocation of D2 compiler.** Tests assert string goldens only; regression like literal `\n` vs real newline would not be caught without external compile. | test file | Optional: `d2 compile` fixture step behind env flag or in spec 028 harness. |
| D2-13 | **No preview server / batch export path.** CLIs exist; no `GET /v3/d2/<slug>` or batch job beside manual `export-d2.mjs`. | scripts only | Spec 028 or preview spec if stakeholders need UI export. |
| D2-14 | **Edge count test uses ` -> ` substring.** Container headers and labels containing ` -> ` could false-count (unlikely in corpus). | tiered-network test | Count only lines matching `/^[^\\n]+ -> [^\\n]+$/` or split arrow section. |

---

## P3 — Comparison with hand-crafted PoC

Reference: `../d2/juju-4-architecture.d2` (vision-extraction YAML → manual D2).

| Capability | Hand-crafted PoC | AST exporter |
|------------|------------------|--------------|
| D2 `classes` / stroke colors | Yes | No |
| Container labels on blocks | Yes | Yes (`heading` / `label`) |
| Nested hierarchy | Yes | Yes |
| Arrow labels | Yes | Yes |
| Arrow styling | Yes | No (silent) |
| ELK + sketch | Yes | ELK flag only |
| Icon shapes | Implicit via class | Warn only |

The exporter targets **structure + connectivity**, not visual parity with Canonical on-brand styling — aligned with 022 “adapter only” scope.

---

## Recommended follow-up (ordered)

1. Fix **D2-01**, **D2-03**, **D2-04**, **D2-06** (small code + doc patches).
2. Land **spec 028** for import + round-trip fidelity matrix and shared export hardening.
3. Consider **D2 compile** golden in CI when `d2` binary is available (WSL/devcontainer).

---

## What passed review

- Nested containers mirror frame tree; juju bootstrap compiles to SVG under D2 0.7.1.
- Multiline labels use `\n` escapes (D2-safe).
- Anchor-qualified refs degrade with `D2_UNSUPPORTED_ANCHOR_REF`.
- Arrow labels exported (meaningful improvement over Mermaid v1).
- Warning paths align with AST locations (`root.children[n]`, `arrows[i]`).
- CLI mirrors `export-mermaid.mjs` (`--slug`, `--out`, `--strict`).
