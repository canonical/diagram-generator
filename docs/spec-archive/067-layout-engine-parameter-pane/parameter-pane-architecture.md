# Parameter Pane Architecture (Spec 067)

Target: **~150 layout operators** with Houdini-like semantics — one generic pane,
operator-owned parm templates, no mixed override bags.

## Mental model

```
┌─────────────────────────────────────────────────────────────┐
│  Preview document                                           │
│  meta.layout_engine: "elk-layered"   ← active operator id   │
│  meta.elk: { elk.spacing.nodeNode: "32", ... }  ← persisted│
│  meta.dagre: { ... }                     ← other operator   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  PreviewEngineManifest (per operator)                       │
│  id, layoutEngineKey, controlSpecs[], persistNamespace      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  LayoutOperatorOverrideState (session)                      │
│  activeOperatorKey: string                                  │
│  byOperator: Map<operatorKey, Record<parmKey, value>>      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  resolveEffectiveLayoutOperatorOverrides()  ← SINGLE OWNER  │
│  merge YAML slice + session bucket                            │
│  apply visibleWhen → drop hidden keys                       │
│  coerce types per PreviewControlSpec.kind                   │
└─────────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
   Pane render          requestRelayout      save payload
```

## Canonical operator key

Use **`layoutEngineKey`** (frame YAML `meta.layout_engine` value) as the bucket
key. Preview engine `id` may differ only for legacy aliases; resolver accepts
manifest and normalizes to `layoutEngineKey` when present.

Examples:

| layoutEngineKey | persistNamespace | Preview engine id |
|-----------------|------------------|-------------------|
| `elk-layered` | `meta.elk` | `elk-layered` |
| `elk-force` | `meta.elk` | `elk-force` |
| `dagre` | `meta.dagre` | `dagre` |

Multiple operators may share a YAML namespace (`meta.elk`). That is allowed on
disk **only when the key set is compatible with one manifest** — see validation
below.

## Resolver contract

```typescript
interface LayoutOperatorOverrideContext {
  /** Resolved manifest for the active operator */
  manifest: PreviewEngineManifest;
  /** Authored YAML namespaces from FrameDiagram.engineLayout */
  engineLayout?: Record<string, Record<string, string>>;
  /** Legacy alias; treat as engineLayout['meta.elk'] */
  elkLayout?: Record<string, string>;
  /** Per-operator session buckets */
  session: LayoutOperatorOverrideState;
}

function resolveEffectiveLayoutOperatorOverrides(
  context: LayoutOperatorOverrideContext,
): Record<string, string>;
```

Rules:

1. Start from YAML: `engineLayout[manifest.persistNamespace]` (+ `elkLayout` alias).
2. Overlay session bucket for `manifest.layoutEngineKey ?? manifest.id`.
3. Build display map from merged values + spec defaults.
4. Filter to specs where `visibleWhen` passes against display map.
5. Return only those keys, coerced to strings for layout engines.

**Prune-on-write:** when the user changes a control, update the session bucket,
run resolver, then write back the pruned bucket (drop keys not in step 4).

## Operator switch

On `meta.layout_engine` change (workspace tab, engine switcher, reload):

1. Set `session.activeOperatorKey`.
2. If bucket missing, seed from YAML namespace for new manifest.
3. Rebuild pane from `manifest.controlSpecs`.
4. Relayout uses resolver output — never prior operator bucket.

Inactive buckets remain in `session.byOperator` for tab switching during the same
browser session but are invisible to steps 3–4.

## Save / validate

**Emit:**

```json
{
  "engine_layout_overrides": {
    "meta.elk": { /* effective keys only */ }
  }
}
```

**Validate `meta.elk`:**

For key set `K`, find manifests `M` where every key in `K` is in `M.controlSpecs`.
- |matches| = 0 → reject (unknown keys).
- |matches| > 1 → reject (ambiguous cross-algorithm mix).
- |matches| = 1 → accept.

Also require consistency with document `meta.layout_engine` when set: the declared
engine's manifest must be among matches (or the only match).

**Validate `meta.dagre`:** keys ⊆ `DAGRE_PREVIEW_ENGINE.controlSpecs` only.

## Migration / historical YAML

Load-time normalization (one-time per diagram load):

- If `meta.layout_engine` is set, strip persisted namespace keys not in that
  manifest from the in-memory `engineLayout` slice used for relayout.
- Do **not** silently rewrite YAML on disk until save; avoid surprise diffs on
  unrelated edits.

Document fixtures that intentionally carry legacy implementation-owned ELK keys
continue to use existing strip paths (`stripImplementationOwnedElkLayeredOverrides`).

## UI host scaling

Required end state:

- One aside region: **Layout parameters**
- `hostView.sidebarSections: ['layout-params']` on all graph engines
- `createPreviewEngineLayoutControlsRuntime` with section ids from manifest host
  metadata, not hardcoded `elk-layout` vs `graph-layout`

## Per-operator grouping

Replace centralized `elkParamGroups()` as the primary ordering mechanism:

- **Default:** order by `spec.group` using registry declaration order within group.
- **Optional:** manifest `hostView.paramGroups?: { group, keys[] }[]` for custom
  ordering without renderer branching.

Layered ELK may keep `elkParamGroups()` as registry-local metadata exported to
the manifest at registration time.

## Forbidden patterns at 150 operators

| Anti-pattern | Why |
|--------------|-----|
| Flat `layoutOverrides` shared across operators | Mixed incompatible parms |
| Union of all `meta.elk` keys as save allowlist | Validates impossible sets |
| Renderer `if (engineId === …)` | Choke point |
| Separate merge logic in bridge vs pane vs save | Drift / bugs |
| Seeding session only from `elkLayout` | Breaks Dagre + multi-namespace |
| Separate first-class `elk-layout` and `graph-layout` pane hosts | Shell branches with engine count |
| Internal typed ownership under legacy ELK-only names | Duplicate maintenance lanes |

## Scale bar checklist

Before claiming closeout for 150-operator readiness:

- [ ] New engine onboarding touches ≤3 product files (registry, engine definition,
      contract test) plus generated manifest registration.
- [ ] Resolver runtime is O(n) in active manifest `controlSpecs` length.
- [ ] Validation precomputes manifest key sets once at registry init, not per
      keystroke.
- [ ] No file grows linearly with engine count except the registry list itself.

## Key files (expected touch points)

| Area | Files |
|------|-------|
| Resolver owner | `packages/layout-engine/src/preview-shell/layout-operator-overrides.ts` |
| Pane runtime | `packages/layout-engine/src/preview-engine/elk-layout-controls.ts` |
| Shell controller | `packages/layout-engine/src/preview-engine/elk-shell-controller.ts` |
| Persistence model | `packages/layout-engine/src/preview-shell/preview-override-model.ts` |
| Frame-YAML contract | `packages/layout-engine/src/preview-shell/frame-yaml-engine-layout-contract.ts` |
| Save guards | `packages/layout-engine/src/preview-shell/app-save-payload.ts` |
| Relayout bridge | `packages/layout-engine/src/preview-shell/app-layout-bridge-runtime.ts` |
| Fresh render | `packages/layout-engine/src/preview-shell/app-fresh-render.ts` |
| Load / seed | `packages/layout-engine/src/preview-shell/app-grid-editor-runtime.ts` |
| Server persist | `apps/preview/src/persistence/frame-engine-layout-namespaces.ts` |
| Onboarding docs | `specs/052-layout-engine-onboarding-port/engine-onboarding-checklist.md` |

## Tests to add

| Test | Proves |
|------|--------|
| Resolver unit: visibleWhen branch switch prunes | SC-002 |
| Resolver unit: operator switch isolates buckets | SC-003 |
| Save payload: ambiguous meta.elk rejected | SC-004 |
| persist → reload: meta.dagre | SC-005 |
| persist → reload: meta.elk layered | SC-006 |
| Engine switch + reload with two namespaces | SC-007 |

## Review delta (2026-06-29)

- The original “`|matches| > 1` always reject” rule was too strict. Shared ELK
  keys are allowed to match multiple manifests; the active/persisted
  `meta.layout_engine` must disambiguate when present.
- Undo/snapshot/restore are part of the state model. A per-operator pane model
  that does not also persist `layoutOperatorOverrides` through editor snapshots
  still leaks across reload/undo.
- Because 066 already owns the tactical prune/reload/validation fixes on the
  current branch, this architecture is implemented under 066 rather than as a
  second active branch/spec.
