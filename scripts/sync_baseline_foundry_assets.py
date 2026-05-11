from __future__ import annotations

import argparse
import shutil
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
SOURCE_ROOT = ROOT.parent / "baseline-foundry"
SOURCE_OS_CSS = SOURCE_ROOT / "dist" / "tiers" / "os" / "styles.css"
SOURCE_FONT = SOURCE_ROOT / "assets" / "fonts" / "UbuntuSans[wdth,wght].ttf"
VENDOR_ROOT = ROOT / "assets" / "baseline-foundry"
VENDOR_OS_CSS = VENDOR_ROOT / "os" / "styles.css"
VENDOR_FONT = VENDOR_ROOT / "fonts" / SOURCE_FONT.name


def main() -> int:
    parser = argparse.ArgumentParser(description="Sync vendored Baseline Foundry preview assets into this repo.")
    parser.add_argument("--if-present", action="store_true", help="Exit cleanly when the sibling Baseline Foundry repo is missing.")
    args = parser.parse_args()

    if not SOURCE_OS_CSS.exists() or not SOURCE_FONT.exists():
        if args.if_present:
            print("[sync-baseline-foundry-assets] skipping: sibling baseline-foundry build output not available.")
            return 0
        raise SystemExit("Expected ../baseline-foundry with dist/tiers/os/styles.css and assets/fonts/UbuntuSans[wdth,wght].ttf")

    shutil.rmtree(VENDOR_ROOT, ignore_errors=True)
    VENDOR_OS_CSS.parent.mkdir(parents=True, exist_ok=True)
    VENDOR_FONT.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(SOURCE_OS_CSS, VENDOR_OS_CSS)
    shutil.copy2(SOURCE_FONT, VENDOR_FONT)
    print(f"[sync-baseline-foundry-assets] synced os CSS and Ubuntu Sans into {VENDOR_ROOT.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())