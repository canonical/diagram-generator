# Specification Quality Checklist: Figma-to-YAML Round Trip

- [x] The spec 079 gap is explicit and not confused with refresh.
- [x] YAML/Figma authority is bounded per property.
- [x] Supported v1 layout mappings are enumerated.
- [x] Unsupported finishing remains visible and preserved.
- [x] Stable identity, baseline, and hashes are required.
- [x] Three-way conflicts are testable.
- [x] File modes and unsafe-path protection are explicit.
- [x] No-op, comment preservation, and persist→reload are gates.
- [x] ELK and waypoints are not overclaimed.
- [x] Persistence allowlists remain single-source.
- [x] Refresh protects unsynced Figma changes.
- [x] Parallel lanes have disjoint ownership.
- [x] Live Figma/adversarial review are closeout gates.
