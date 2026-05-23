"""Export generated SVG diagrams to PNG at multiple scale factors.

Uses Playwright (Chromium) to render SVGs faithfully with fonts loaded,
then captures full-page screenshots at the requested device scale factors.

Usage:
    python scripts/export_png.py diagrams/2.output/svg/logic-data-vram-onbrand-v2.svg
    python scripts/export_png.py diagrams/2.output/svg/*.svg --scale 1,2,3
    python scripts/export_png.py --all --scale 2

Output goes to diagrams/2.output/png/ with filenames like:
    logic-data-vram-onbrand-v2@1x.png
    logic-data-vram-onbrand-v2@2x.png
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright


# HTML wrapper to render SVGs with proper font loading and white background.
_SVG_HTML = """\
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  * {{ margin: 0; padding: 0; }}
  body {{ background: #fff; }}
  img {{ display: block; }}
</style></head>
<body><img src="{src}" /></body>
</html>
"""

OUTPUT_DIR = Path("diagrams/2.output/png")


def _file_uri(path: Path) -> str:
    return path.resolve().as_uri()


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Export SVG diagrams to PNG at multiple scale factors."
    )
    parser.add_argument(
        "svgs",
        nargs="*",
        type=Path,
        help="SVG file(s) to export. Use --all to export all generated SVGs.",
    )
    parser.add_argument(
        "--all",
        action="store_true",
        help="Export all SVGs in diagrams/2.output/svg/",
    )
    parser.add_argument(
        "--scale",
        default="1,2",
        help="Comma-separated scale factors (default: 1,2)",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=OUTPUT_DIR,
        help=f"Output directory (default: {OUTPUT_DIR})",
    )
    args = parser.parse_args()

    try:
        scales = [int(s.strip()) for s in args.scale.split(",") if s.strip()]
    except ValueError:
        print(f"Error: invalid scale value in '{args.scale}'", file=sys.stderr)
        return 1
    if not scales or not all(1 <= s <= 4 for s in scales):
        print("Error: scale factors must be between 1 and 4", file=sys.stderr)
        return 1

    svg_dir = Path("diagrams/2.output/svg")
    if args.all:
        svgs = sorted(svg_dir.glob("*.svg"))
    else:
        svgs = args.svgs

    if not svgs:
        print("No SVG files specified. Use --all or provide paths.", file=sys.stderr)
        return 1

    # Verify all inputs exist
    for svg in svgs:
        if not svg.exists():
            print(f"Error: {svg} does not exist", file=sys.stderr)
            return 1

    args.output_dir.mkdir(parents=True, exist_ok=True)

    print(f"Exporting {len(svgs)} SVG(s) at scales {scales}...")
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        # Use device_scale_factor on the context for crisp rendering
        max_scale = max(scales)
        context = browser.new_context(
            viewport={"width": 2400, "height": 4000},
            device_scale_factor=max_scale,
        )
        page = context.new_page()

        total = 0
        for svg in svgs:
            print(f"\n  {svg.name}:")
            # For each scale, re-create context with the right DPR
            for scale in scales:
                ctx = None
                try:
                    if scale != max_scale:
                        ctx = browser.new_context(
                            viewport={"width": 2400, "height": 4000},
                            device_scale_factor=scale,
                        )
                        p = ctx.new_page()
                    else:
                        p = page

                    stem = svg.stem
                    out_path = args.output_dir / f"{stem}@{scale}x.png"

                    tmp_html = args.output_dir / f"_tmp_{stem}.html"
                    tmp_html.write_text(
                        _SVG_HTML.format(src=_file_uri(svg)),
                        encoding="utf-8",
                    )
                    p.goto(_file_uri(tmp_html), wait_until="load")
                    p.wait_for_timeout(1500)
                    p.screenshot(
                        path=str(out_path),
                        full_page=True,
                        timeout=30000,
                        animations="disabled",
                    )
                    print(f"    {out_path.name}")
                    total += 1
                finally:
                    tmp_html = args.output_dir / f"_tmp_{svg.stem}.html"
                    tmp_html.unlink(missing_ok=True)
                    if ctx:
                        ctx.close()

        context.close()
        browser.close()

    print(f"\nDone: {total} PNG(s) exported to {args.output_dir}/")
    return 0


if __name__ == "__main__":
    sys.exit(main())
