# ELK ordering spike — 2026-07-07

Goal: reproduce the bounded follow-up from the 2026-07-07 Opus review using a
checked-in harness instead of the missing `tmp/` artifacts.

Artifacts:

- script: `specs/076-tls-mermaid-cold-start-fit/evidence/elk-ordering-spike.mjs`
- result: `specs/076-tls-mermaid-cold-start-fit/evidence/elk-ordering-spike-result.json`

## Variants exercised

1. `baseline`
2. `row-model-order`
3. `all-compounds-include-children`
4. `flatten-order-rows`
5. `compound-ports-*`

The first three keep the ordering rows
(`openstack_relation_row`, `load_balancer_relation_row`,
`load_balancer_endpoint_row`) as separate compounds and vary only model-order
options plus ancestor `INCLUDE_CHILDREN`.

The fourth flattens those rows into `INCLUDE_CHILDREN` just to establish whether
the failure is specifically tied to separate ordering-row compounds.

The later `compound-ports-*` variants follow the 2026-07-07 Opus direction more
literally:

- internal edges are owned by their compounds
- root only owns the cross-cluster fan-out
- load balancers can optionally route through explicit row-boundary ports
- parent-compound model-order is toggled separately from row-local model-order

## Result

- `baseline`: FAIL
- `row-model-order`: FAIL
- `all-compounds-include-children`: FAIL
- `flatten-order-rows`: RUNS, but still fails the reference shape
- `compound-ports-nested-edges`: FAIL
- `compound-ports-compound-order`: FAIL
- `compound-ports-compound-order-containers`: FAIL
- `compound-ports-row-ports`: FAIL with `TypeError`
- `compound-ports-row-ports-containers`: FAIL with `TypeError`
- `compound-ports-row-ports-no-compound-order`: RUNS, but still fails the reference shape
- `compound-ports-row-ports-no-model-order`: RUNS, but still fails the reference shape
- `compound-ports-row-ports-compound-strategy`: FAIL with `TypeError`
- `compound-ports-row-ports-compound-strategy-force`: FAIL with `TypeError`
- `compound-ports-row-ports-compound-strategy-port`: FAIL with `TypeError`
- `compound-ports-row-ports-openstack-strategy-only`: FAIL with `TypeError`

## What failed

For the original leaf-to-leaf and simple parent-port variants, ELK throws the
same hierarchy error on the first cross-cluster fan-out edge:

`UnsupportedGraphException: The source or the target of edge "manual->public" ... could not be found`

This means the current raw-ELK spike cannot yet represent
`manual_tls_certificates -> traefik_*` while preserving the ordering rows as
independent compounds, even after:

- enabling row-local model-order options
- promoting provider/service compounds to `INCLUDE_CHILDREN`
- moving cross-cluster fan-out onto parent-compound ports
- explicitly owning internal edges on the compounds that contain them

## What ran

Two shapes now run:

1. Flattening the ordering rows to `INCLUDE_CHILDREN`
2. Keeping the rows separate, but routing through explicit row-boundary ports
   **without** parent-compound model-order

Both successful variants:

- preserves endpoint row order:
  - `traefik_public`
  - `traefik_internal`
  - `traefik_rgw`
- does **not** restore the source-critical vertical relation:
  - `openstack_relation_row` is not above `octavia_k8s`
  - both resolve to the same `y` in this spike (`12`)

## Crash root-cause update

The 2026-07-07 rerun narrows the old `elkjs` crash materially:

1. Row-boundary hierarchical ports by themselves do **not** crash.
2. Adding parent-compound `considerModelOrder.strategy = NODES_AND_EDGES`
   reintroduces the `TypeError: Cannot read properties of undefined (reading 'a')`.
3. The crash reproduces even when that parent-compound strategy is applied only
   to `openstack_services`, so it is not specific to `load_balancers`.
4. Adding `forceNodeModelOrder` or `portModelOrder` does not change the outcome;
   the crash already appears at `considerModelOrder.strategy`.

So the immediate blocker is now more precise than before:

1. Cross-hierarchy leaf-to-leaf and parent-port-to-leaf edges fail while
   ordering rows remain separate compounds.
2. Parent-port -> row-port -> leaf routing avoids the hierarchy error.
3. Parent-compound model-order on top of that row-port shape crashes ELK.
4. Without parent-compound model-order, ELK runs and preserves endpoint order,
   but still keeps `openstack_relation_row` level with `octavia_k8s` instead of
   above it.

So the next spike should stop varying only option values and instead test a
different edge shape:

- keep the working row-port hierarchy shape
- search for a non-`considerModelOrder.strategy` way to lift
  `openstack_relation_row` above `octavia_k8s`
- or prove that the remaining vertical ordering requires a typed lowering shim,
  not more ELK option tuning

That is the remaining gap before any product-path cluster lowering should land.
