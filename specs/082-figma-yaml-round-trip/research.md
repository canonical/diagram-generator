# Research: Figma-to-YAML Round Trip

## Confirmed baseline

- Spec 079 is YAML → Figma component-instance import.
- Refresh preservation is not Figma → YAML synchronization.
- Managed nodes use shared plugin data namespace `dgp` with import/component/
  slot identities.
- Selected-YAML import currently sends raw content and source name; a name is
  not safe write authority.
- Canonical persistence already owns direction, gap, padding, sizing,
  dimensions, position, child order, text, style, and coercion.
- Arrow waypoint persistence is separate from frame layout updates.

## Required investigation

T001–T005 must record exact evidence for:

- readable stable IDs after SlotNode reparenting;
- component property availability for text/icon changes;
- Figma HUG/FILL and computed-dimension behavior;
- writable handles in Figma Desktop/browser;
- safe source association for repo and arbitrary files;
- YAML comment/order preservation;
- ELK engine namespaces and possible lossless mappings;
- connector representation and arrow identity.

## Initial decisions

| Question | Direction |
|---|---|
| Extend 079? | No; 079 stays the import dependency and 082 owns reverse merge/write. |
| Source of truth | YAML structure; Figma finishing; explicit per-field merge. |
| Capture | Delta from versioned baseline, not scene serialization. |
| Conflict | Three-way, field-level, explicit resolution. |
| First route | Component/autolayout. |
| ELK | Fail closed until engine mapping proves equivalence. |
| Writes | Handle or allowed-root receipt; otherwise download. |
| Patch rules | Reuse/extract canonical typed persistence. |
| Structural edits | Report/block in v1. |
| Connectors | Follow-up after stable arrow IDs. |

## Rejected approaches

- Recreate YAML by serializing Figma frames.
- Use Figma names/node IDs as canonical identity.
- Write computed HUG/FILL sizes as FIXED.
- Apply without rereading current YAML hash.
- Accept arbitrary client filesystem paths.
- Approximate unsupported changes.
- Add product logic to preview legacy scripts.
