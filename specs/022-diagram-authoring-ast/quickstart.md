# Quickstart: Authoring YAML (spec 022)

**Status**: Spec only — compiler not implemented until tasks T001+ land.

## Minimal additive-sugar diagram

```yaml
engine: v3
schema: author-v1
title: Tiered network architecture

defaults:
  client:
    label: Client
    icon: Laptop.svg
  network_server:
    label: [Tier 2, Network server]
    icon: Network.svg

arrows:
  - public_repo -> global_server
  - global_server -> tier2_left

root:
  id: page
  direction: vertical
  padding: 24
  align: top-center
  children:
    - id: public_repo
      label: [Public, repository]
      icon: Cloud.svg
      sizing_w: fill

    - id: tier2_row
      direction: horizontal
      children:
        - id: group_left
          direction: vertical
          children:
            - id: tier2_left
              use: network_server
            - id: client_l1
              use: client
              label: Special client
```

## Arrow forms

**Shorthand**

```yaml
arrows:
  - public_repo -> global_server
```

**Object (extensible)**

```yaml
arrows:
  - source: global_server.right
    target: tier2_left.left
    label: sync
    style: dashed
```

**Mixed** — both in one list; normalize to the same AST.

## Frame tree rules

| Authored shape | Meaning | Valid arrow endpoint |
|----------------|---------|----------------------|
| frame without `children` | leaf | yes |
| frame with `children` | container | yes |

There is no separate `node:` / `group:` grammar in v1. A frame becomes a container when it has children.

## Container arrows are valid

```yaml
arrows:
  - tier2_row -> global_server
  - group_left.right -> tier2_left.left
```

The compiler must preserve authored refs and validate that the base frame ids exist.

## Defaults and overrides

```yaml
defaults:
  client:
    label: Client
    icon: Laptop.svg

root:
  id: page
  children:
    - id: client_l1
      use: client
      label: Special client   # wins over default
```

## Compile (after implementation)

```bash
# From repo root — exact CLI names from tasks T064/T073
node packages/layout-engine/scripts/export-mermaid.mjs scripts/diagrams/frames/tiered-network-architecture.author-v1.yaml
node packages/layout-engine/scripts/export-d2.mjs scripts/diagrams/frames/tiered-network-architecture.author-v1.yaml
```

## Current document shape still loads

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

No deprecation is expected for `arrows` or `root`; they remain canonical in v1.

See [contracts/migration-example.md](contracts/migration-example.md) for a full before/after example.# Quickstart: Authoring YAML (spec 022)

**Status**: Spec only — compiler not implemented until tasks T001+ land.

## Minimal additive-sugar diagram

```yaml
engine: v3
schema: author-v1
title: Tiered network architecture

defaults:
  client:
    label: Client
    icon: Laptop.svg
  network_server:
    label: [Tier 2, Network server]
    icon: Network.svg

arrows:
  - public_repo -> global_server
  - global_server -> tier2_left

root:
  id: page
  direction: vertical
  padding: 24
  align: top-center
  children:
    - id: public_repo
      label: [Public, repository]
      icon: Cloud.svg
      sizing_w: fill

    - id: tier2_row
      direction: horizontal
      children:
        - id: group_left
          direction: vertical
          children:
            - id: tier2_left
              use: network_server
            - id: client_l1
              use: client
              label: Special client
```

## Arrow forms

**Shorthand**

```yaml
arrows:
  - public_repo -> global_server
```

**Object (extensible)**

```yaml
arrows:
  - source: global_server.right
    target: tier2_left.left
    label: sync
    style: dashed
```

**Mixed** — both in one list; normalize to the same AST.

## Frame tree rules

| Authored shape | Meaning | Valid arrow endpoint |
|----------------|---------|----------------------|
| frame without `children` | leaf | yes |
| frame with `children` | container | yes |

There is no separate `node:` / `group:` grammar in v1. A frame becomes a container when it has children.

## Container arrows are valid

```yaml
arrows:
  - tier2_row -> global_server
  - group_left.right -> tier2_left.left
```

The compiler must preserve authored refs and validate that the base frame ids exist.

## Defaults and overrides

```yaml
defaults:
  client:
    label: Client
    icon: Laptop.svg

root:
  id: page
  children:
    - id: client_l1
      use: client
      label: Special client   # wins over default
```

## Compile (after implementation)

```bash
# From repo root — exact CLI names from tasks T064/T073
node packages/layout-engine/scripts/export-mermaid.mjs scripts/diagrams/frames/tiered-network-architecture.author-v1.yaml
node packages/layout-engine/scripts/export-d2.mjs scripts/diagrams/frames/tiered-network-architecture.author-v1.yaml
```

## Current document shape still loads

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

No deprecation is expected for `arrows` or `root`; they remain canonical in v1.

See [contracts/migration-example.md](contracts/migration-example.md) for a full before/after example.