---
name: level-assignment
description: "Assign correct frame levels in YAML when nesting > 0. Use when creating or modifying a frame YAML that contains containers (items with children). Ensures siblings share the same visual class."
argument-hint: "Path to the frame YAML file, or describe the nesting structure"
---

# Level assignment

## When to use

- Creating a new frame YAML with containers (any item that has `children:`).
- Modifying an existing frame YAML where nesting depth changes (adding/removing children).
- Reviewing a diagram where siblings have inconsistent levels.
- Any time `level:` values need to be set or corrected.

## The rule

Level assignment is an **authoring-time** rule. It follows from the
**deepest nesting among siblings**, not from each item's own children.
By default, the engine requires explicit `level:` fields in YAML - it
does not guess levels from structure. This procedure tells you how to
choose the right value. Diagrams may opt into a typed `meta.frame_roles`
profile; those profiles synthesize explicit levels during compile before
style resolution and must be generic, not fixture-keyed.

### Algorithm

Let `D` be the maximum structural child-nesting depth across a sibling
group.

1. **`D = 0` → child / leaf (`level: 1`).** Items without `children:`
   and without `level:` are leaves by default.

2. **`D = 1` → parent / panel (`level: 2`).** When any item at a given
   depth has structural children, promote **all siblings at that depth**
   to `level: 2` - including those without children. A childless panel
   is a grey card; that's fine.

3. **`D >= 2` → section (`level: 3`).** When any item at a given depth
   contains a panel that itself contains structural children, promote
   **all siblings at that depth** to `level: 3` - including those that
   only wrap leaves directly or have no children at all.

### Key insight

Siblings never mix classes. If one item needs to be a section, **all** its siblings are sections. If one item needs to be a panel, **all** its siblings are panels.

## Procedure

1. **Map the nesting.** For each depth in the tree, find the maximum nesting depth among siblings.

2. **Assign levels bottom-up.**
   - Deepest items with no children: level 1 (leaf). No `level:` needed in YAML; it's the default.
   - Their parent's depth: if any sibling at this depth has children, all siblings get `level: 2`.
   - Grandparent's depth: if any sibling at this depth contains a level-2 panel with children, all siblings get `level: 3`.

3. **Set `level:` explicitly** on every headed container in the YAML. Leaves don't need an explicit level.
   If a diagram declares `meta.frame_roles.strategy`, verify that the profile is
   the intended generic rule before omitting levels.

4. **Verify sibling consistency.** Scan each group of siblings. Every sibling at the same depth must have the same level.

5. **Check hierarchy rules.**
    - No section (3) inside a section (3).
    - No panel (2) inside a panel (2).
    - Wrappers (`level: 0`) are layout-only and do not count as a tier.
    - Annotations (`variant: annotation`) are exempt from level rules.
    - Highlights (`variant: highlight`) keep their structural level; they
      only change fill/text contrast.
    - Separators (`role: separator`) are outside the box-tier system.
    - Layout wrappers (headingless containers with no `heading:` field)
      get level 0 automatically and don't count as a tier.
    - If you violate the nesting rules, `resolveStyles()` in
      `packages/layout-engine/src/resolve-styles.ts` auto-downgrades at
      render time: a panel inside a panel becomes a leaf, a section
      inside a section becomes a panel. This is a safety net, not a
      feature - set levels correctly in YAML.

## Styling contract

Levels determine visual treatment automatically through `resolveStyles()`
(TS: `packages/layout-engine/src/resolve-styles.ts`). See `docs/frame-classes.md` for the
complete class table and rendering rules. Do **not** use inline styling
in YAML.

## Configured role profiles

`meta.frame_roles.strategy: root-edge-source-section-target-parent` is available
for layered provider/consumer topologies. Root compounds that contain sources of
cross-root arrows become sections (`level: 3`); root compounds that contain
targets of cross-root arrows become parents (`level: 2`). Explicit authored
`level:` values still win.

### Inline style ban

- **No `weight:` in label lines.** Use `heading:` for bold text on a frame.
- **No `fill:` in label lines.** Use `style: muted` for grey annotation text.
- **No `size:` in label lines.** Font sizes are determined by the class system.

### Heading field

Use `heading:` on the frame for bold heading text:

```yaml
# Container with heading (gets synthetic __heading child)
- id: my_panel
  level: 2
  heading: "Panel title"
  children:
    - id: child1
      label: [Content]

# Non-container with heading (heading prepended as bold first line)
- id: my_leaf
  heading: "Leaf title"
  label:
    - Body text below the heading
```

## Example

Planning, Implementation, and Delivery are siblings. Implementation wraps "Dev team" (a panel wrapping leaves) – that's 2-level nesting. Therefore **all three** are sections (`level: 3`), even though Planning and Delivery only contain leaves directly.

```yaml
children:
  - id: planning
    level: 3           # section – sibling has 2-level nesting
    heading: Planning
    children:
      - id: p_task1
        label: [Define scope]
      - id: p_task2
        label: [Set timeline]

  - id: implementation
    level: 3           # section – has 2-level nesting
    heading: Implementation
    children:
      - id: devteam
        level: 2       # panel – has children
        heading: Dev team
        children:
          - id: dev1
            label: [Frontend]
          - id: dev2
            label: [Backend]

  - id: delivery
    level: 3           # section – sibling has 2-level nesting
    heading: Delivery
    children:
      - id: d_task1
        label: [Deploy]
```

## Validation

After assigning levels:

1. Run `npm --prefix packages/layout-engine test`.
2. Run `node scripts/check_no_new_python.mjs` from the repo root.
3. Open the diagram in the preview server and verify:
   - Sections have bold headings with black borders.
   - Panels have bold headings with grey fill.
   - Leaves have regular-weight headings with black borders.
   - No sibling group mixes classes.
4. Check that the override count in the editor sidebar shows "No overrides" (or only intentional sizing overrides, not stale ones).
