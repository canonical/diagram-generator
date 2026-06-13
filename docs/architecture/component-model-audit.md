# Component model audit

Date: 2026-05-25  
Phase 1 implemented: 2026-05-25

## Question

Does every type of visual element participate uniformly in layout, selection, and inspection – or does the code branch on type with different capabilities per type?

## Background

The 2026-05-19 Figma/Penpot research and 2026-05-21 v3 engine audit confirmed the **layout math** matches industry standard (two-pass measure/place, FILL/HUG/FIXED, coercion). Neither audit checked the **component model**: whether all node types are treated uniformly by the system, with only rendering varying by type.

In Figma and Penpot, every object – rectangle, line, text, frame, component instance – is a node in the same tree. All participate equally in autolayout, selection, and inspection. The visual representation is type-specific; the system capabilities are not.

## Findings

### By classification

| Classification | Count | Verdict |
|---|---|---|
| Correct dispatch | 16 | Fine – rendering varies by type |
| Legitimate structural | 26 | Fine – is_leaf vs is_container genuinely need different layout recursion |
| **Capability exclusion** | **16** | **Bug** – types denied capabilities that should be universal |
| **Missing abstraction** | **3** | **Debt** – concepts hard-coded where they should be data-driven |

### Capability exclusions (16 occurrences)

Separators and arrows are systematically excluded from capabilities that should be universal:

| File | Line | What's excluded |
|---|---|---|
| editor.js | 114–115 | Drag peer snapping |
| editor.js | 1350 | Inspector UI |
| editor.js | 1593 | Multi-select operations (explicit UI hint) |
| editor.js | 1906–1907 | Property editing (whitelist: box, panel, terminal only) |
| editor.js | 1926 | Property iteration |
| editor.js | 2037 | Container property check |
| editor.js | 2129 | Property getter loop |
| editor.js | 2154 | Selection validity |
| editor.js | 2454 | Override application |
| editor.js | 2470 | Root traversal |
| editor.js | 3257 | Droppable target list |
| editor.js | 5244 | Style picker (whitelist: box, panel, terminal only) |
| layout-bridge.js | 500 | SVG patching |

**Pattern:** every interaction system has a `!== "separator" && !== "arrow"` guard. Adding a new component type requires touching 13+ locations.

### Missing abstractions (3 occurrences)

| Location | What's hard-coded | What it should be |
|---|---|---|
| historical Python renderer | Separator render: early return, DashedLinePrimitive + TextBlock | Render dispatch after standard bounds resolution – same `(x, y, w, h)` contract |
| layout-bridge.js:500 | Separator excluded from SVG patching | All nodes patched uniformly; render dispatch handles visual differences |
| editor.js:2683 | Arrows can have children but skip normal processing | Arrow-children relationship should be typed and documented, or removed |

### Heading as a magic field

Not captured in the type-branching audit because it branches on `frame.heading` (a data field) rather than on type. But it's the same class of problem:

- `_heading_height()` adds space outside the children flow in `measure()`
- Heading text is positioned by coordinate arithmetic in the render, not by autolayout
- In Figma, a heading would be a text child of the frame, laid out by autolayout like any other child

### Icon/text coordinate arithmetic

Similarly not a type branch, but a missing internal component model:

- Icon positioned at `x + w - pad_r - ICON_SIZE` (fixed position, not layout)
- Text width capped at `w - pad_l - pad_r - icon_col` (estimated, not resolved)
- Bold text overflows the estimate because `_estimate_text_width()` ignores font weight
- In Figma, icon and text would be children of a horizontal auto-layout frame

## Principle

Every Frame participates equally in layout, selection, and inspection regardless of its `role`. The rendering layer dispatches to the right visual based on role – but the system capabilities are uniform. Adding a new component type should require:

1. A role value (e.g., `role: "callout"`)
2. Natural-size defaults in `_leaf_natural_size()` (keyed on role)
3. A render dispatch case in `_render_frame()` (after standard bounds resolution)
4. Zero changes to selection, inspector, drag, override, or serialisation code

## Remediation plan

### Phase 1 – Make layout and selection type-agnostic (DONE – 2026-05-25)

Implemented changes:
- Removed separator early return from `_render_frame()` – separator now emits DashedLinePrimitive (visual) + FrameBox (hit-testing rect + label text) like any other node
- Removed separator exclusion from `patchFrameGroup` / `patchSvgFromLayout` in layout-bridge.js – separator groups rebuilt with `<line>` + `<rect>` + `<text>` during relayout
- Removed 10 `!== "separator"` exclusion guards from editor.js (snap targets, selection action items, multi-select operations, property editing, sizing, validity check, reflow post-pass, drag group bounds)
- Changed style picker from type whitelist (`box`/`panel`/`terminal` only) to type blacklist (everything except `arrow`)
- Updated multi-select hint from "Arrow and separator selections" to "Arrow selections"
- Updated separator test to expect FrameBox instead of standalone TextBlock
- YAML files unchanged – separators already default to `sizing_w: FILL` (borderless leaf default) and `sizing_h: HUG`

Result: Separators are now fully selectable, inspectable, and participate in all editor operations. 188 tests pass. Browser-verified on both `android-container-vs-vm` and `android-security-comparison`. Zero console errors.

### Phase 2 – Heading as a child, not a field

- Convert `heading` from a magic Frame field to an auto-generated first child with `role: "heading"`
- Remove `_heading_height()` and `heading_gap` from `measure()` – heading participates in normal autolayout
- Heading sizing: `sizing_w: fill`, `sizing_h: hug`, with icon-height minimum enforced as `min_height`
- This is a breaking change to the YAML schema – needs migration of all 24 frame YAMLs

### Phase 3 – Box interior as component layout

- Icon and text become internal layout children of the box, not coordinate-positioned
- Icon: FIXED width (`ICON_SIZE`), right-aligned
- Text: FILL (takes remaining width), wraps at resolved width
- Eliminates the bold-text-overflow bug class entirely

### Phase 4 – Arrow integration (separate milestone)

- Arrows are a legitimate parallel data structure for our use case (edges routed after node placement)
- The arrow routing algorithm is the real problem, not the data model
- See the arrow routing research plan (R1–R5) in TODO.md – this is a separate milestone
