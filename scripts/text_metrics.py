"""Text metrics — font loading and text measurement.

Provides build-time text width measurement using the actual Ubuntu Sans
Variable font via fontTools.  This is the Python equivalent of the
Canvas.measureText() adapter in the TypeScript port.
"""

from __future__ import annotations

import pathlib

from fontTools.ttLib import TTFont

from design_tokens import (
    BASELINE_UNIT,
    BODY_SIZE,
    LINE_HEIGHTS_BY_SIZE,
    SORTED_LINE_HEIGHT_SIZES,
    round_up_to_grid,
)


ROOT = pathlib.Path(__file__).resolve().parents[1]

# ---------------------------------------------------------------------------
# Font metrics (single load at module init)
# ---------------------------------------------------------------------------

_FONT_PATH = ROOT / "assets" / "UbuntuSans[wdth,wght].ttf"
_font: TTFont | None = None
_cmap: dict[int, str] | None = None
_hmtx: object | None = None
_units_per_em: int = 1000
_SPACE_ADVANCE: float = 0.25  # fallback fraction of em for unknown glyphs
_glyph_sets: dict[int, object] = {}  # weight → glyph set cache


def _ensure_font_loaded() -> None:
    global _font, _cmap, _hmtx, _units_per_em
    if _font is not None:
        return
    _font = TTFont(str(_FONT_PATH))
    _cmap = _font.getBestCmap()
    _hmtx = _font["hmtx"]
    _units_per_em = _font["head"].unitsPerEm


def _get_glyph_set(weight: int) -> object:
    """Return a cached glyph set for the given font weight."""
    if weight not in _glyph_sets:
        _ensure_font_loaded()
        _glyph_sets[weight] = _font.getGlyphSet(location={"wght": weight})
    return _glyph_sets[weight]


def measure_text_width(text: str, font_size: float, weight: int = 400) -> float:
    """Measure text width using actual font glyph advance widths.

    Uses the variable font's glyph set at the specified weight for accurate
    measurement of both regular and bold text.  This is the single source of
    truth for text width measurement in the build-time pipeline.
    """
    _ensure_font_loaded()
    if weight != 400:
        gs = _get_glyph_set(weight)
        total_units = 0.0
        for ch in text:
            glyph_name = _cmap.get(ord(ch))
            if glyph_name and glyph_name in gs:
                total_units += gs[glyph_name].width
            else:
                total_units += _units_per_em * _SPACE_ADVANCE
        return total_units * font_size / _units_per_em
    # Fast path for weight 400: use the hmtx table directly
    total_units = 0
    for ch in text:
        glyph_name = _cmap.get(ord(ch))
        if glyph_name and glyph_name in _hmtx.metrics:
            advance, _ = _hmtx.metrics[glyph_name]
            total_units += advance
        else:
            total_units += int(_units_per_em * _SPACE_ADVANCE)
    return total_units * font_size / _units_per_em


def size_to_px(value: str | int | float) -> float:
    """Convert a size value (string like '18' or '18px', or numeric) to float px."""
    if isinstance(value, (int, float)):
        return float(value)
    stripped = value.strip().lower()
    if stripped.endswith("px") or stripped.endswith("pt"):
        return float(stripped[:-2])
    return float(stripped)


def default_line_step(value: str | int | float) -> int:
    """Look up the canonical line height for a given font size."""
    size_px = int(round(size_to_px(value)))
    if size_px in LINE_HEIGHTS_BY_SIZE:
        return LINE_HEIGHTS_BY_SIZE[size_px]
    for candidate in SORTED_LINE_HEIGHT_SIZES:
        if size_px <= candidate:
            return LINE_HEIGHTS_BY_SIZE[candidate]
    return round_up_to_grid(size_px * 1.1, BASELINE_UNIT)


def estimate_line_width(spec: dict[str, object]) -> float:
    """Estimate the rendered width of a single line spec."""
    text = str(spec["content"])
    size = size_to_px(spec.get("size", BODY_SIZE))
    weight = int(spec.get("weight", 400))
    return measure_text_width(text, size, weight)


def wrap_text_lines(lines: list[dict[str, object]], max_width: float) -> list[dict[str, object]]:
    """Wrap text lines at word boundaries using real font metrics."""
    if max_width <= 0:
        return [dict(spec) for spec in lines]

    result: list[dict[str, object]] = []
    for spec in lines:
        text = str(spec["content"])
        line_w = estimate_line_width(spec)
        if line_w <= max_width:
            result.append(dict(spec))
            continue

        size = size_to_px(spec.get("size", BODY_SIZE))
        weight = int(spec.get("weight", 400))
        words = text.split()
        current = ""
        for word in words:
            test = (current + " " + word) if current else word
            test_w = measure_text_width(test, size, weight)
            if test_w <= max_width or not current:
                current = test
            else:
                result.append({**spec, "content": current})
                current = word
        if current:
            result.append({**spec, "content": current})
        elif not words:
            result.append(dict(spec))
    return result
