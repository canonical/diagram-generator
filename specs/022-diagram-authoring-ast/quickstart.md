# Quickstart: Authoring YAML (spec 022)

**Status**: Spec only — compiler not implemented until tasks T001+ land.

## Minimal new-style diagram

```yaml
engine: v3
schema: author-v1
title: Tiered network architecture

edges:
  - public_repo -> global_server
  - global_server -> tier2_left

defaults:
  client:
    label: Client
    icon: Laptop.svg
  network_server:
    label: [Tier 2, Network server]
    icon: Network.svg

layout:
  direction: vertical
  padding: 24
  align: top-center
  children:
    - node: public_repo
      label: [Public, repository]
      icon: Cloud.svg
      sizing_w: fill

    - group: tier2_row
      direction: horizontal
      children:
        - group: group_left
          direction: vertical
          children:
            - node: tier2_left
              use: network_server
            - node: client_l1
              use: client
              label: Special client
```

## Edge forms

**Shorthand**

```yaml
edges:
  - public_repo -> global_server
```

**Object (extensible)**

```yaml
edges:
  - source: global_server
    target: tier2_left
    label: sync
    style: dashed
```

**Mixed** — both in one list; normalize to the same AST.

## Node vs group

| Key | Role | Edges |
|-----|------|-------|
| `node:` | Visible connectable leaf | Valid endpoint |
| `group:` | Layout container | Invalid endpoint (unless `connectable: true`) |

## Defaults and overrides

```yaml
defaults:
  client:
    label: Client
    icon: Laptop.svg

layout:
  children:
    - node: client_l1
      use: client
      label: Special client   # wins over default
```

## Compile (after implementation)

```bash
# From repo root — exact CLI names from tasks T064/T073
node packages/layout-engine/scripts/export-mermaid.mjs scripts/diagrams/frames/tiered-network-architecture.author-v1.yaml
node packages/layout-engine/scripts/export-d2.mjs scripts/diagrams/frames/tiered-network-architecture.author-v1.yaml
```

## Legacy document (still loads)

```yaml
engine: v3
title: Tiered network architecture
arrows:
  - source: public_repo
    target: global_server
root:
  id: page
  direction: vertical
  children:
    - id: public_repo
      label:
        - Public
        - repository
```

Expect deprecation warning: `arrows` → use `edges`.

See [contracts/migration-example.md](contracts/migration-example.md) for full before/after.
