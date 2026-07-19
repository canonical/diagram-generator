# Data Model: Diagram Review Workspace

## Identity rules

- IDs are opaque strings with a documented namespace and normalization rule.
- A review-entry ID identifies the logical diagram/pattern, not a file path.
- A variant ID identifies one route/render/engine representation under an
  entry.
- A finding ID derives from provider, board/file identity, comment/thread
  identity, and first-seen identity—not mutable comment text.
- Board node IDs and local absolute paths are locators, never canonical IDs.
- Hashes identify content revisions and determine review staleness.

## ReviewSet

| Field | Purpose |
|---|---|
| `schemaVersion` | Contract compatibility |
| `reviewSetId` | Stable campaign identity |
| `title` | Reviewer-facing name |
| `generatedAt` | Preparation evidence |
| `source` | Adapter and repository context |
| `entries[]` | Logical diagrams/patterns |

## ReviewEntry and ReviewVariant

An entry holds the stable logical identity, title, family/tags, source references
and optional registry pattern/artifact IDs. Each variant records its own stable
ID, route, format, engine, artifact reference, content hash, dimensions, and
optional lineage references to canonical YAML, Figma, SVG, and PNG.

Variants are the board-level review targets. Multiple variants may belong to
one logical entry and must remain distinguishable during comment collection.

## ReviewFindings and ReviewFinding

The findings document records its schema, review set, source board/file,
collection time, and normalized findings. A finding contains:

- stable finding and provider-comment identities;
- entry/variant target or explicit unresolved target;
- author and time metadata;
- normalized text without discarding the provider reference;
- state (`open`, `resolved`, `reopened`, or `deleted`);
- triage disposition and optional severity;
- reviewed source hash;
- routed external references and deduplication keys.

Collection merges by stable finding ID. Mutable provider state updates the same
finding. Routing never changes the finding identity.

## RegistryReviewSummary

The registry projection belongs to a pattern or artifact lineage and records:

- latest review set and FigJam URL;
- reviewed source hash and collection timestamp;
- finding counts by state, disposition, and severity;
- Figma and SVG/PNG deliverable references;
- routed issue/spec references;
- `fresh`, `stale`, `unknown`, or `not-reviewed` state.

`stale` is derived when the current canonical/artifact hash differs from the
reviewed hash. Historical review records remain append-only evidence.

## State transitions

```text
comment observed -> finding open -> triaged
                              |-> routed
                              |-> resolved
resolved -> reopened
provider deleted -> retained with deleted source state
unresolved target -> manually linked -> resolved target identity
review fresh -> source hash changes -> review stale
```

## Validation invariants

1. Entry IDs are unique within a review set.
2. Variant IDs are unique within an entry and globally addressable with the
   entry ID.
3. Each artifact has exactly one content hash for the prepared run.
4. Absolute local paths and credentials are forbidden in portable outputs.
5. A routed reference includes adapter, target ID/URL, and deduplication key.
6. Unknown images use provisional identities explicitly marked provisional.
7. Unresolved comments remain serializable and must not be dropped.
