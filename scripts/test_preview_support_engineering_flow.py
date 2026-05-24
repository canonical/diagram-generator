from __future__ import annotations

import contextlib
import pathlib
import socket
import subprocess
import sys
import time
import urllib.request

import pytest
from playwright.sync_api import sync_playwright


ROOT = pathlib.Path(__file__).resolve().parent.parent
SCRIPTS = ROOT / "scripts"


def _reserve_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind(("127.0.0.1", 0))
        return int(sock.getsockname()[1])


def _wait_for_server(base_url: str, process: subprocess.Popen[str], timeout: float = 90.0) -> None:
    deadline = time.time() + timeout
    last_error: Exception | None = None
    while time.time() < deadline:
        if process.poll() is not None:
            output = process.stdout.read() if process.stdout else ""
            raise RuntimeError(
                f"Preview server exited with code {process.returncode}.\n{output}"
            )
        try:
            with urllib.request.urlopen(base_url, timeout=1):
                return
        except Exception as exc:  # pragma: no cover - retry loop
            last_error = exc
            time.sleep(0.25)
    raise RuntimeError(f"Preview server did not start at {base_url}: {last_error}")


@contextlib.contextmanager
def _preview_server() -> str:
    port = _reserve_port()
    process = subprocess.Popen(
        [
            sys.executable,
            str(SCRIPTS / "preview_server.py"),
            "--port",
            str(port),
            "--no-watch",
        ],
        cwd=str(ROOT),
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
    )
    base_url = f"http://127.0.0.1:{port}"
    try:
        _wait_for_server(base_url, process)
        yield base_url
    finally:
        process.terminate()
        try:
            process.wait(timeout=10)
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait(timeout=10)


def test_support_engineering_flow_preview_regression():
    with _preview_server() as base_url:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=True)
            page = browser.new_page(viewport={"width": 1600, "height": 1200})
            try:
                page.goto(f"{base_url}/view/v3:support-engineering-flow", wait_until="domcontentloaded")
                page.wait_for_function(
                    """
                    () => (
                      typeof selectedIds !== 'undefined' &&
                      typeof setFrameProp === 'function' &&
                      typeof applyAllOverrides === 'function' &&
                      typeof applyV3Style === 'function' &&
                      document.querySelector('[data-component-id="page"]') !== null &&
                      document.querySelector('[data-component-id="step_analysis"]') !== null &&
                      document.querySelector('[data-component-id="step_fix"]') !== null
                    )
                    """
                )
                page.wait_for_timeout(150)

                baseline = page.evaluate(
                    """
                    () => ({
                      geometry: (() => {
                        const pageRect = document
                          .querySelector('[data-component-id="page"]')
                          .querySelector(':scope > rect');
                        const svg = document.querySelector('#stage svg');
                        return {
                          page: {
                            x: pageRect.getAttribute('x'),
                            y: pageRect.getAttribute('y'),
                            width: pageRect.getAttribute('width'),
                            height: pageRect.getAttribute('height'),
                          },
                          svg: {
                            width: svg.getAttribute('width'),
                            height: svg.getAttribute('height'),
                            viewBox: svg.getAttribute('viewBox'),
                          },
                        };
                      })(),
                      coords: (() => {
                        const pageBox = document
                          .querySelector('[data-component-id="page"]')
                          .getBoundingClientRect();
                        const childBox = document
                          .querySelector('[data-component-id="step_analysis"] rect')
                          .getBoundingClientRect();
                        return {
                          childX: childBox.left + childBox.width / 2,
                          childY: childBox.top + childBox.height / 2,
                          pageMarginX: childBox.left + childBox.width / 2,
                          pageMarginY: Math.min(pageBox.bottom - 8, childBox.bottom + 24),
                        };
                      })(),
                    })
                    """
                )

                page.locator('[data-component-id="step_analysis"] rect').click()
                page.wait_for_function("() => Array.from(selectedIds).length === 1 && Array.from(selectedIds)[0] === 'step_analysis'")
                child_click = page.evaluate(
                    """
                    () => ({
                      selected: Array.from(selectedIds),
                      handleCount: document.querySelectorAll('.dg-handle').length,
                      outlineCount: document.querySelectorAll('.dg-handle-outline').length,
                      geometry: (() => {
                        const pageRect = document
                          .querySelector('[data-component-id="page"]')
                          .querySelector(':scope > rect');
                        const svg = document.querySelector('#stage svg');
                        return {
                          page: {
                            x: pageRect.getAttribute('x'),
                            y: pageRect.getAttribute('y'),
                            width: pageRect.getAttribute('width'),
                            height: pageRect.getAttribute('height'),
                          },
                          svg: {
                            width: svg.getAttribute('width'),
                            height: svg.getAttribute('height'),
                            viewBox: svg.getAttribute('viewBox'),
                          },
                        };
                      })(),
                    })
                    """
                )
                assert child_click["selected"] == ["step_analysis"]
                assert child_click["handleCount"] == 8
                assert child_click["outlineCount"] == 1
                assert child_click["geometry"] == baseline["geometry"]

                blank_coords = page.evaluate(
                    """
                    () => {
                      const pageBox = document
                        .querySelector('[data-component-id="page"]')
                        .getBoundingClientRect();
                      const childBox = document
                        .querySelector('[data-component-id="step_analysis"] rect')
                        .getBoundingClientRect();
                      return {
                        x: childBox.left + childBox.width / 2,
                        y: Math.min(pageBox.bottom - 8, childBox.bottom + 24),
                      };
                    }
                    """
                )
                page.mouse.click(blank_coords["x"], blank_coords["y"])
                page.wait_for_function("() => Array.from(selectedIds).length === 1 && Array.from(selectedIds)[0] === 'page'")
                page_click = page.evaluate(
                    """
                    () => ({
                      selected: Array.from(selectedIds),
                      handleCount: document.querySelectorAll('.dg-handle').length,
                      outlineCount: document.querySelectorAll('.dg-handle-outline').length,
                      rootSelectedClass: document
                        .querySelector('[data-component-id="page"]')
                        .classList.contains('dg-selected'),
                      geometry: (() => {
                        const pageRect = document
                          .querySelector('[data-component-id="page"]')
                          .querySelector(':scope > rect');
                        const svg = document.querySelector('#stage svg');
                        return {
                          page: {
                            x: pageRect.getAttribute('x'),
                            y: pageRect.getAttribute('y'),
                            width: pageRect.getAttribute('width'),
                            height: pageRect.getAttribute('height'),
                          },
                          svg: {
                            width: svg.getAttribute('width'),
                            height: svg.getAttribute('height'),
                            viewBox: svg.getAttribute('viewBox'),
                          },
                        };
                      })(),
                    })
                    """
                )
                assert page_click["selected"] == ["page"]
                assert page_click["handleCount"] == 8
                assert page_click["outlineCount"] == 1
                assert page_click["rootSelectedClass"] is True
                assert page_click["geometry"] == baseline["geometry"]

                metrics = page.evaluate(
                    """
                    async () => {
                      function sleep(ms) {
                        return new Promise((resolve) => setTimeout(resolve, ms));
                      }

                      function componentMetrics(id) {
                        const group = document.querySelector(`[data-component-id="${id}"]`);
                        const rect = group.querySelector(':scope > rect');
                        const text = group.querySelector(':scope > text');
                        const bbox = text.getBBox();
                        const rectBottom = Number(rect.getAttribute('y') || '0') + Number(rect.getAttribute('height') || '0');
                        return {
                          rectFill: rect.getAttribute('fill'),
                          textFill: text.querySelector('tspan')?.getAttribute('fill') || null,
                          rectWidth: Number(rect.getAttribute('width') || '0'),
                          rectHeight: Number(rect.getAttribute('height') || '0'),
                          overflow: bbox.y + bbox.height > rectBottom + 0.5,
                        };
                      }

                      function textSignature(id) {
                        const group = document.querySelector(`[data-component-id="${id}"]`);
                        const text = group.querySelector(':scope > text') || group.querySelector('text');
                        return Array.from(text.querySelectorAll('tspan'))
                          .map((tspan) => tspan.textContent || '')
                          .join('|');
                      }

                      function arrowMetrics(id, sourceId, targetId) {
                        const arrow = document.querySelector(`[data-component-id="${id}"]`);
                        const lines = Array.from(arrow.querySelectorAll('line'));
                        const shaft = lines[lines.length - 1];
                        const polygon = arrow.querySelector('polygon');
                        const points = (polygon.getAttribute('points') || '')
                          .trim()
                          .split(/ +/)
                          .map((pair) => pair.split(',').map(Number));
                        const base = {
                          x: (points[0][0] + points[2][0]) / 2,
                          y: (points[0][1] + points[2][1]) / 2,
                        };
                        const tip = { x: points[1][0], y: points[1][1] };
                        const sourceRect = document
                          .querySelector(`[data-component-id="${sourceId}"]`)
                          .querySelector(':scope > rect');
                        const targetRect = document
                          .querySelector(`[data-component-id="${targetId}"]`)
                          .querySelector(':scope > rect');
                        const source = {
                          x: Number(sourceRect.getAttribute('x') || '0'),
                          y: Number(sourceRect.getAttribute('y') || '0'),
                          width: Number(sourceRect.getAttribute('width') || '0'),
                          height: Number(sourceRect.getAttribute('height') || '0'),
                        };
                        const target = {
                          x: Number(targetRect.getAttribute('x') || '0'),
                          y: Number(targetRect.getAttribute('y') || '0'),
                          width: Number(targetRect.getAttribute('width') || '0'),
                          height: Number(targetRect.getAttribute('height') || '0'),
                        };
                        return {
                          shaftEnd: {
                            x: Number(shaft.getAttribute('x2') || '0'),
                            y: Number(shaft.getAttribute('y2') || '0'),
                          },
                          base,
                          tip,
                          expectedSource: {
                            x: source.x + source.width,
                            y: source.y + source.height / 2,
                          },
                          expectedTarget: {
                            x: target.x,
                            y: target.y + target.height / 2,
                          },
                          endpoints: lines.flatMap((line) => [
                            {
                              x: Number(line.getAttribute('x1') || '0'),
                              y: Number(line.getAttribute('y1') || '0'),
                            },
                            {
                              x: Number(line.getAttribute('x2') || '0'),
                              y: Number(line.getAttribute('y2') || '0'),
                            },
                          ]),
                        };
                      }

                      function gridSpacingMetrics() {
                        const firstRect = document
                          .querySelector('[data-component-id="step_problem"]')
                          .querySelector(':scope > rect');
                        const secondRect = document
                          .querySelector('[data-component-id="step_investigation"]')
                          .querySelector(':scope > rect');
                        const pageRect = document
                          .querySelector('[data-component-id="page"]')
                          .querySelector(':scope > rect');
                        const overlay = document.querySelector('#stage svg #dg-grid-overlay');
                        const colBands = overlay
                          ? Array.from(overlay.querySelectorAll('rect'))
                              .map((rect) => ({
                                x: Number(rect.getAttribute('x') || '0'),
                                width: Number(rect.getAttribute('width') || '0'),
                                fill: rect.getAttribute('fill') || '',
                              }))
                              .filter((rect) => rect.fill === 'rgba(100,160,255,0.04)')
                          : [];
                        const firstX = Number(firstRect.getAttribute('x') || '0');
                        const firstW = Number(firstRect.getAttribute('width') || '0');
                        const secondX = Number(secondRect.getAttribute('x') || '0');
                        return {
                          pageWidth: Number(pageRect.getAttribute('width') || '0'),
                          colGapInput: Number(document.getElementById('grid-col-gap').value || '0'),
                          pageGapInput: Number(document.getElementById('grid-margin').value || '0'),
                          gridColGap: Number(gridInfo?.col_gap || 0),
                          gridOuterMargin: Number(gridInfo?.outer_margin || 0),
                          firstBandX: colBands[0]?.x ?? null,
                          firstBandWidth: colBands[0]?.width ?? null,
                          secondBandX: colBands[1]?.x ?? null,
                          bandCount: colBands.length,
                          pageOverride: JSON.parse(JSON.stringify(overrides.page || null)),
                          pageGap: firstX,
                          firstWidth: firstW,
                          secondX,
                          gutter: secondX - (firstX + firstW),
                        };
                      }

                      cycleGuideMode();
                      await sleep(50);
                      const expectedText = textSignature('step_fix');
                      const linkedBefore = gridSpacingMetrics();

                      document.getElementById('grid-col-gap').value = '32';
                      onGridControlChange();
                      await sleep(400);
                      const linkedAfterExpand = gridSpacingMetrics();

                      document.getElementById('grid-col-gap').value = String(linkedBefore.colGapInput);
                      onGridControlChange();
                      await sleep(400);
                      const linkedAfterReset = gridSpacingMetrics();

                      setFrameProp('page', 'padding', 48);
                      await sleep(350);
                      setFrameProp('page', 'padding', 24);
                      await sleep(350);
                      setFrameProp('page', 'direction', 'VERTICAL');
                      await sleep(350);
                      setFrameProp('page', 'direction', 'HORIZONTAL');
                      await sleep(350);
                      const roundTrip = componentMetrics('step_fix');
                      const roundTripText = textSignature('step_fix');

                      const managedText = document
                        .querySelector('[data-component-id="step_fix"]')
                        .querySelector(':scope > text');
                      managedText.setAttribute('data-orig-inner', '<tspan x="0" y="0">stale snapshot</tspan>');
                      applyAllOverrides();
                      await sleep(50);
                      const staleProbeText = textSignature('step_fix');
                      const arrow = arrowMetrics('step_analysis->step_fix', 'step_analysis', 'step_fix');

                      applyV3Style('step_fix', 'highlight');
                      await sleep(350);
                      const highlight = componentMetrics('step_fix');
                      const highlightText = textSignature('step_fix');

                      applyV3Style('step_fix', '');
                      await sleep(350);
                      const reset = componentMetrics('step_fix');
                      const resetText = textSignature('step_fix');

                      return {
                        arrow,
                        expectedText,
                        linkedBefore,
                        linkedAfterExpand,
                        linkedAfterReset,
                        roundTrip,
                        roundTripText,
                        staleProbeText,
                        highlight,
                        highlightText,
                        reset,
                        resetText,
                      };
                    }
                    """
                )

                assert metrics["expectedText"] == metrics["roundTripText"]
                assert metrics["expectedText"] == metrics["staleProbeText"]
                assert metrics["expectedText"] == metrics["highlightText"]
                assert metrics["expectedText"] == metrics["resetText"]
                assert metrics["linkedBefore"]["pageWidth"] == 1464
                assert metrics["linkedBefore"]["pageGapInput"] == metrics["linkedBefore"]["colGapInput"]
                assert abs(metrics["linkedBefore"]["pageGap"] - metrics["linkedBefore"]["gutter"]) < 0.75
                assert metrics["linkedBefore"]["gridOuterMargin"] == metrics["linkedBefore"]["gridColGap"]
                assert metrics["linkedBefore"]["bandCount"] == 5
                assert abs(metrics["linkedBefore"]["firstBandX"] - metrics["linkedBefore"]["pageGap"]) < 0.75
                assert abs(metrics["linkedBefore"]["firstBandWidth"] - metrics["linkedBefore"]["firstWidth"]) < 0.75
                assert abs(metrics["linkedBefore"]["secondBandX"] - metrics["linkedBefore"]["secondX"]) < 0.75
                assert metrics["linkedBefore"]["pageOverride"] in (None, {})
                assert metrics["linkedAfterExpand"]["colGapInput"] == 32
                assert metrics["linkedAfterExpand"]["pageGapInput"] == 32
                assert metrics["linkedAfterExpand"]["gridColGap"] == 32
                assert metrics["linkedAfterExpand"]["gridOuterMargin"] == 32
                assert metrics["linkedAfterExpand"]["pageWidth"] == 1472
                assert metrics["linkedAfterExpand"]["bandCount"] == 5
                assert metrics["linkedAfterExpand"]["pageOverride"] in (None, {})
                assert abs(metrics["linkedAfterExpand"]["firstBandX"] - metrics["linkedAfterExpand"]["pageGap"]) < 0.75
                assert abs(metrics["linkedAfterExpand"]["firstBandWidth"] - metrics["linkedAfterExpand"]["firstWidth"]) < 0.75
                assert abs(metrics["linkedAfterExpand"]["secondBandX"] - metrics["linkedAfterExpand"]["secondX"]) < 0.75
                assert abs(metrics["linkedAfterExpand"]["pageGap"] - 32) < 0.75
                assert abs(metrics["linkedAfterExpand"]["gutter"]) < 32.75 and abs(metrics["linkedAfterExpand"]["gutter"] - 32) < 0.75
                assert metrics["linkedAfterReset"]["pageGapInput"] == metrics["linkedBefore"]["pageGapInput"]
                assert metrics["linkedAfterReset"]["gridOuterMargin"] == metrics["linkedBefore"]["gridOuterMargin"]
                assert metrics["linkedAfterReset"]["pageOverride"] in (None, {})
                assert metrics["linkedAfterReset"]["pageWidth"] == metrics["linkedBefore"]["pageWidth"]
                assert abs(metrics["linkedAfterReset"]["firstBandX"] - metrics["linkedAfterReset"]["pageGap"]) < 0.75
                assert abs(metrics["linkedAfterReset"]["firstBandWidth"] - metrics["linkedAfterReset"]["firstWidth"]) < 0.75
                assert abs(metrics["linkedAfterReset"]["secondBandX"] - metrics["linkedAfterReset"]["secondX"]) < 0.75
                assert abs(metrics["linkedAfterReset"]["pageGap"] - metrics["linkedBefore"]["pageGap"]) < 0.75
                assert abs(metrics["linkedAfterReset"]["gutter"] - metrics["linkedBefore"]["gutter"]) < 0.75
                assert not metrics["roundTrip"]["overflow"]
                assert metrics["roundTrip"]["rectWidth"] > 0
                assert metrics["roundTrip"]["rectHeight"] > 0
                assert abs(metrics["arrow"]["shaftEnd"]["x"] - metrics["arrow"]["base"]["x"]) < 0.75
                assert abs(metrics["arrow"]["shaftEnd"]["y"] - metrics["arrow"]["base"]["y"]) < 0.75
                assert any(
                  abs(point["x"] - metrics["arrow"]["expectedSource"]["x"]) < 0.75
                  and abs(point["y"] - metrics["arrow"]["expectedSource"]["y"]) < 0.75
                  for point in metrics["arrow"]["endpoints"]
                )
                assert abs(metrics["arrow"]["tip"]["x"] - metrics["arrow"]["expectedTarget"]["x"]) < 0.75
                assert abs(metrics["arrow"]["tip"]["y"] - metrics["arrow"]["expectedTarget"]["y"]) < 0.75
                assert metrics["highlight"]["rectFill"] == "#000000"
                assert metrics["highlight"]["textFill"] == "#FFFFFF"
                assert not metrics["highlight"]["overflow"]
                assert metrics["reset"]["rectFill"] == "transparent"
                assert metrics["reset"]["textFill"] == "#000000"
                assert not metrics["reset"]["overflow"]
            finally:
                browser.close()


def test_android_graphics_stack_click_selection_prefers_leaf_box():
    with _preview_server() as base_url:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=True)
            page = browser.new_page(viewport={"width": 1600, "height": 1200})
            try:
                page.goto(f"{base_url}/view/v3:android-graphics-stack", wait_until="domcontentloaded")
                page.wait_for_function(
                    """
                    () => (
                      typeof selectedIds !== 'undefined' &&
                      document.querySelector('[data-component-id="page"]') !== null &&
                      document.querySelector('[data-component-id="apps"]') !== null &&
                      document.querySelector('[data-component-id="row_apps"]') !== null
                    )
                    """
                )

                baseline = page.evaluate(
                    """
                    () => {
                      const pageRect = document
                        .querySelector('[data-component-id="page"]')
                        .querySelector(':scope > rect');
                      const svg = document.querySelector('#stage svg');
                      const appsRect = document
                        .querySelector('[data-component-id="apps"] rect')
                        .getBoundingClientRect();
                      return {
                        pageGeometry: {
                          x: pageRect.getAttribute('x'),
                          y: pageRect.getAttribute('y'),
                          width: pageRect.getAttribute('width'),
                          height: pageRect.getAttribute('height'),
                        },
                        svgGeometry: {
                          width: svg.getAttribute('width'),
                          height: svg.getAttribute('height'),
                          viewBox: svg.getAttribute('viewBox'),
                        },
                      };
                    }
                    """
                )

                page.locator('[data-component-id="apps"] rect').click()
                page.wait_for_function(
                    "() => Array.from(selectedIds).length === 1 && Array.from(selectedIds)[0] === 'apps'"
                )

                after_apps = page.evaluate(
                    """
                    () => {
                      const pageRect = document
                        .querySelector('[data-component-id="page"]')
                        .querySelector(':scope > rect');
                      const rowRect = document
                        .querySelector('[data-component-id="row_apps"] rect')
                        .getBoundingClientRect();
                      const pageBounds = document
                        .querySelector('[data-component-id="page"]')
                        .getBoundingClientRect();
                      return {
                        selected: Array.from(selectedIds),
                        handleCount: document.querySelectorAll('.dg-handle').length,
                        outlineCount: document.querySelectorAll('.dg-handle-outline').length,
                        pageGeometry: {
                          x: pageRect.getAttribute('x'),
                          y: pageRect.getAttribute('y'),
                          width: pageRect.getAttribute('width'),
                          height: pageRect.getAttribute('height'),
                        },
                        svgGeometry: {
                          width: document.querySelector('#stage svg').getAttribute('width'),
                          height: document.querySelector('#stage svg').getAttribute('height'),
                          viewBox: document.querySelector('#stage svg').getAttribute('viewBox'),
                        },
                        blankClick: {
                          x: rowRect.left + rowRect.width / 2,
                          y: Math.min(pageBounds.bottom - 12, rowRect.bottom + 16),
                        },
                      };
                    }
                    """
                )

                assert after_apps["selected"] == ["apps"]
                assert after_apps["handleCount"] == 8
                assert after_apps["outlineCount"] == 1
                assert after_apps["pageGeometry"] == baseline["pageGeometry"]
                assert after_apps["svgGeometry"] == baseline["svgGeometry"]

                page.mouse.click(after_apps["blankClick"]["x"], after_apps["blankClick"]["y"])
                page.wait_for_function(
                    "() => Array.from(selectedIds).length === 1 && Array.from(selectedIds)[0] === 'page'"
                )

                after_blank = page.evaluate(
                    """
                    () => {
                      const pageRect = document
                        .querySelector('[data-component-id="page"]')
                        .querySelector(':scope > rect');
                      return {
                        selected: Array.from(selectedIds),
                        handleCount: document.querySelectorAll('.dg-handle').length,
                        outlineCount: document.querySelectorAll('.dg-handle-outline').length,
                        rootSelectedClass: document
                          .querySelector('[data-component-id="page"]')
                          .classList.contains('dg-selected'),
                        pageGeometry: {
                          x: pageRect.getAttribute('x'),
                          y: pageRect.getAttribute('y'),
                          width: pageRect.getAttribute('width'),
                          height: pageRect.getAttribute('height'),
                        },
                        svgGeometry: {
                          width: document.querySelector('#stage svg').getAttribute('width'),
                          height: document.querySelector('#stage svg').getAttribute('height'),
                          viewBox: document.querySelector('#stage svg').getAttribute('viewBox'),
                        },
                      };
                    }
                    """
                )

                assert after_blank["selected"] == ["page"]
                assert after_blank["handleCount"] == 8
                assert after_blank["outlineCount"] == 1
                assert after_blank["rootSelectedClass"] is True
                assert after_blank["pageGeometry"] == baseline["pageGeometry"]
                assert after_blank["svgGeometry"] == baseline["svgGeometry"]
            finally:
                browser.close()


def test_grid_gap_typing_replaces_value_and_page_gap_is_readonly():
    with _preview_server() as base_url:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=True)
            page = browser.new_page(viewport={"width": 1600, "height": 1200})
            try:
                page.goto(f"{base_url}/view/android-container-vs-vm", wait_until="domcontentloaded")
                page.wait_for_function(
                    """
                    () => (
                      document.getElementById('grid-col-gap') !== null &&
                      document.getElementById('grid-row-gap') !== null &&
                      document.getElementById('grid-margin') !== null &&
                      document.querySelector('#stage svg') !== null
                    )
                    """
                )
                page.wait_for_timeout(150)

                row_gap = page.locator('#grid-row-gap')
                row_gap.click()
                row_gap.type('32', delay=50)
                page.wait_for_timeout(300)

                metrics = page.evaluate(
                    """
                    () => ({
                      rowGapValue: document.getElementById('grid-row-gap').value,
                      rowGapReadOnly: document.getElementById('grid-row-gap').readOnly,
                      pageGapValue: document.getElementById('grid-margin').value,
                      pageGapReadOnly: document.getElementById('grid-margin').readOnly,
                      rows: document.getElementById('grid-rows').value,
                    })
                    """
                )

                assert metrics['rowGapValue'] == '32'
                assert metrics['rowGapReadOnly'] is False
                assert metrics['pageGapValue'] == '24'
                assert metrics['pageGapReadOnly'] is True
                assert metrics['rows'] != '6'
            finally:
                browser.close()