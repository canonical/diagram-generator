"""Frame-based layout model.

A diagram is a tree of Frames. Each Frame is an auto-layout container
(like Figma's auto-layout) that positions its children sequentially with
a consistent gap between their rendered edges.

Layout is a two-pass tree walk:
  1. Measure (bottom-up): compute each node's natural size from content.
  2. Place (top-down): distribute space to children, assign positions.

This replaces the old grid-based layout with its outset hack.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum, auto

from diagram_model import Line, Fill, Border


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class Direction(Enum):
    HORIZONTAL = auto()
    VERTICAL = auto()


class Sizing(Enum):
    HUG = auto()       # shrink-wrap to content
    FILL = auto()      # expand to share remaining space equally with peers
    FIXED = auto()     # use explicit width/height


class Align(Enum):
    """Content alignment within a frame (Figma 9-point model).

    Combines main-axis and cross-axis positions.
    """
    TOP_LEFT = auto()
    TOP_CENTER = auto()
    TOP_RIGHT = auto()
    CENTER_LEFT = auto()
    CENTER = auto()
    CENTER_RIGHT = auto()
    BOTTOM_LEFT = auto()
    BOTTOM_CENTER = auto()
    BOTTOM_RIGHT = auto()


# ---------------------------------------------------------------------------
# Frame node
# ---------------------------------------------------------------------------

@dataclass
class Frame:
    """A layout node — either a container (has children) or a leaf (has label).

    When children is non-empty, this is a container that lays out its
    children according to direction/gap/padding.
    When children is empty, this is a leaf box with text/icon content.

    Sizing is per-axis (Figma model):
      - sizing_w: how this node sizes on the X axis
      - sizing_h: how this node sizes on the Y axis
    The parent's direction determines which axis is "primary" (along layout
    flow) and which is "counter" (cross-axis):
      - HORIZONTAL: primary=W, counter=H
      - VERTICAL:   primary=H, counter=W
    FILL on the primary axis = share remaining space with peers.
    FILL on the counter axis = stretch to fill cross-axis space.
    HUG/FIXED on the counter axis = keep measured size; parent alignment
    positions within the remaining slack.

    Padding: ``padding`` sets all four sides uniformly. Per-side overrides
    (``padding_top``, ``padding_right``, ``padding_bottom``, ``padding_left``)
    are applied in ``__post_init__`` — if any is explicitly set via kwarg they
    take priority, otherwise they inherit from ``padding``.
    """
    id: str = ""

    # ── Layout properties ──
    direction: Direction = Direction.VERTICAL
    gap: int = 24               # px between rendered child edges
    padding: int = 8            # uniform padding (all sides); per-side overrides below
    align: Align = Align.TOP_LEFT  # content alignment (Figma 9-point)

    # ── Per-axis sizing ──
    sizing_w: Sizing = Sizing.HUG   # how this node sizes on X
    sizing_h: Sizing = Sizing.HUG   # how this node sizes on Y
    width: int | None = None    # explicit width (when sizing_w=FIXED)
    height: int | None = None   # explicit height (when sizing_h=FIXED)
    min_width: int | None = None
    max_width: int | None = None
    min_height: int | None = None
    max_height: int | None = None

    # ── Per-side padding (default: inherit from ``padding``) ──
    padding_top: int | None = None
    padding_right: int | None = None
    padding_bottom: int | None = None
    padding_left: int | None = None

    # ── Appearance ──
    fill: Fill = Fill.WHITE
    border: Border = Border.SOLID
    heading: Line | None = None
    icon: str | None = None
    icon_fill: str | None = None

    # ── Content (leaf) ──
    label: list[Line] = field(default_factory=list)
    role: str = ""               # e.g. "separator" for dashed line rendering

    # ── Children (container) ──
    children: list[Frame] = field(default_factory=list)

    # ── Computed during layout (not user-set) ──
    _measured_w: float = field(default=0, init=False, repr=False)
    _measured_h: float = field(default=0, init=False, repr=False)
    _placed_x: float = field(default=0, init=False, repr=False)
    _placed_y: float = field(default=0, init=False, repr=False)
    _placed_w: float = field(default=0, init=False, repr=False)
    _placed_h: float = field(default=0, init=False, repr=False)

    def __post_init__(self):
        """Fill per-side padding from the uniform ``padding`` value."""
        if self.padding_top is None:
            self.padding_top = self.padding
        if self.padding_right is None:
            self.padding_right = self.padding
        if self.padding_bottom is None:
            self.padding_bottom = self.padding
        if self.padding_left is None:
            self.padding_left = self.padding
        # Validate min/max constraints
        for attr in ("min_width", "max_width", "min_height", "max_height"):
            v = getattr(self, attr)
            if v is not None and v < 0:
                raise ValueError(f"{attr} cannot be negative, got {v}")
        if (self.min_width is not None and self.max_width is not None
                and self.min_width > self.max_width):
            raise ValueError(
                f"min_width ({self.min_width}) > max_width ({self.max_width})")
        if (self.min_height is not None and self.max_height is not None
                and self.min_height > self.max_height):
            raise ValueError(
                f"min_height ({self.min_height}) > max_height ({self.max_height})")

    @property
    def is_leaf(self) -> bool:
        return len(self.children) == 0

    @property
    def is_container(self) -> bool:
        return len(self.children) > 0


# ---------------------------------------------------------------------------
# Diagram root (Frame + arrows + metadata)
# ---------------------------------------------------------------------------

@dataclass
class FrameDiagram:
    """Root of a diagram: a Frame tree plus connectors and metadata."""
    title: str = ""
    root: Frame = field(default_factory=Frame)
    arrows: list = field(default_factory=list)  # list of Arrow from diagram_model
    grid_cols: int = 2
    grid_col_gap: int | None = None
    grid_row_gap: int | None = None
    grid_outer_margin: int | None = None
