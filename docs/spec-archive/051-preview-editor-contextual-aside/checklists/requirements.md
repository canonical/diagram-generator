# Requirements Checklist: Spec 051

## Completeness

- [x] Problem statement names the concrete regression class.
- [x] Current UI inventory lists all visible preview chrome sections.
- [x] Engine-specific visibility rules cover v3, ELK, force, and sequence.
- [x] Selection-specific rules cover empty, single frame, container, arrow,
      root, same-parent multi, mixed-parent multi, and unsupported selections.
- [x] Ordered improvement plan is included.
- [x] Tests and validation commands are specified.

## Architecture

- [x] Behavior is routed to TypeScript preview-shell or preview-engine owners.
- [x] Legacy JS changes are restricted to delegation/glue.
- [x] Manifest capabilities are preferred over engine-id branching.
- [x] The spec does not add Python product-path logic.

## UX

- [x] Right-aside grouping is explicit and Figma-inspired without copying
      unrelated Figma surface area.
- [x] Hidden vs disabled rules are specified for controls where state matters.
- [x] Engine switch persistence/reload behavior is documented.
