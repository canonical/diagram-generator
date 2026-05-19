"""Standalone interactive auto-layout demo.

Serves a page where you can visually manipulate:
  - Parent direction (vertical / horizontal)
  - Content alignment (9-point grid)
  - Per-child sizing (HUG / FILL)
  - Gap and padding

Run:  python scripts/demo_autolayout.py
Open: http://127.0.0.1:8200
"""

from __future__ import annotations

import json
import sys
import os
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

sys.path.insert(0, os.path.dirname(__file__))

from frame_model import Frame, FrameDiagram, Direction, Sizing, Align
from diagram_model import Line, Fill, Border
from layout_v3 import measure, place


# ---------------------------------------------------------------------------
# SVG renderer (minimal, self-contained)
# ---------------------------------------------------------------------------

def _render_svg(root: Frame, show_labels: bool = True) -> str:
    """Render a placed frame tree as inline SVG."""
    w = int(root._placed_w)
    h = int(root._placed_h)
    parts = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" '
             f'viewBox="0 0 {w} {h}" style="font-family: Ubuntu Sans, sans-serif;">']

    # 8px grid dots
    parts.append('<g opacity="0.15">')
    for gx in range(0, w, 8):
        for gy in range(0, h, 8):
            parts.append(f'<circle cx="{gx}" cy="{gy}" r="0.5" fill="#999"/>')
    parts.append('</g>')

    _render_frame_svg(root, parts, show_labels, depth=0)
    parts.append('</svg>')
    return '\n'.join(parts)


_DEPTH_COLORS = ['#E8E8E8', '#F3F3F3', '#FFFFFF']


def _render_frame_svg(frame: Frame, parts: list, show_labels: bool, depth: int):
    x, y, w, h = frame._placed_x, frame._placed_y, frame._placed_w, frame._placed_h

    fill = frame.fill.value if frame.fill != Fill.WHITE else _DEPTH_COLORS[min(depth, 2)]
    stroke = '#000000'
    dash = 'stroke-dasharray="4 4"' if frame.border == Border.DASHED else ''

    if frame.border != Border.NONE:
        parts.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" '
                     f'fill="{fill}" stroke="{stroke}" stroke-width="1" {dash} '
                     f'stroke-miterlimit="10"/>')

    is_leaf = len(frame.children) == 0
    if show_labels and is_leaf and frame.id and not frame.id.startswith('__'):
        text_fill = '#FFFFFF' if frame.fill == Fill.BLACK else '#000000'
        tx = x + frame.padding
        ty = y + frame.padding + 14  # baseline offset
        label = frame.id
        if frame.label:
            label = frame.label[0].content
        parts.append(f'<text x="{tx}" y="{ty}" fill="{text_fill}" '
                     f'font-size="14" font-weight="400">{_esc(label)}</text>')

        # Show sizing badge
        sizing_label = frame.child_sizing.name
        badge_x = x + w - frame.padding - 4
        badge_y = y + frame.padding + 12
        badge_color = '#E95420' if frame.child_sizing == Sizing.FILL else '#666'
        parts.append(f'<text x="{badge_x}" y="{badge_y}" fill="{badge_color}" '
                     f'font-size="10" text-anchor="end" font-weight="600">'
                     f'{sizing_label}</text>')

    for child in frame.children:
        _render_frame_svg(child, parts, show_labels, depth + 1)


def _esc(s: str) -> str:
    return s.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')


# ---------------------------------------------------------------------------
# Layout computation
# ---------------------------------------------------------------------------

def compute_layout(params: dict) -> str:
    """Build a frame tree from params, lay it out, return SVG."""
    direction = Direction[params.get('direction', 'VERTICAL')]
    align = Align[params.get('align', 'TOP_LEFT')]
    gap = int(params.get('gap', '24'))
    padding = int(params.get('padding', '16'))
    child_count = int(params.get('children', '3'))

    child_a_sizing = Sizing[params.get('child_a_sizing', 'HUG')]
    child_b_sizing = Sizing[params.get('child_b_sizing', 'HUG')]
    child_c_sizing = Sizing[params.get('child_c_sizing', 'HUG')]
    sizings = [child_a_sizing, child_b_sizing, child_c_sizing]

    container_w = int(params.get('container_w', '504'))
    container_h = int(params.get('container_h', '400'))

    children = []
    labels = ['Child A', 'Child B', 'Child C']
    heights = [64, 80, 48]
    widths = [160, 120, 140]
    fills = [Fill.WHITE, Fill.GREY, Fill.WHITE]

    for i in range(min(child_count, 3)):
        child = Frame(
            id=f'child_{chr(65+i).lower()}',
            width=widths[i],
            height=heights[i],
            label=[Line(labels[i])],
            fill=fills[i],
            border=Border.SOLID,
            padding=8,
            child_sizing=sizings[i],
        )
        children.append(child)

    root = Frame(
        id='parent',
        direction=direction,
        align=align,
        gap=gap,
        padding=padding,
        border=Border.DASHED,
        fill=Fill.WHITE,
        children=children,
        sizing=Sizing.FIXED,
        width=container_w,
        height=container_h,
    )

    measure(root)
    place(root, 0, 0, container_w, container_h)

    return _render_svg(root)


# ---------------------------------------------------------------------------
# HTML page
# ---------------------------------------------------------------------------

PAGE_HTML = r"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Auto-Layout Demo</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Ubuntu Sans', system-ui, sans-serif;
    background: #1a1a1a; color: #e0e0e0;
    display: grid; grid-template-columns: 320px 1fr;
    height: 100vh;
  }
  .controls {
    padding: 24px; overflow-y: auto;
    border-right: 1px solid #333;
    display: flex; flex-direction: column; gap: 20px;
  }
  .controls h1 { font-size: 18px; font-weight: 600; color: #fff; }
  .controls h2 { font-size: 13px; font-weight: 600; color: #999;
                  text-transform: uppercase; letter-spacing: 0.05em; }
  .field { display: flex; flex-direction: column; gap: 6px; }
  .field label { font-size: 13px; color: #aaa; }
  .field select, .field input[type=range] {
    background: #2a2a2a; color: #e0e0e0; border: 1px solid #444;
    padding: 6px 8px; border-radius: 4px; font-size: 13px;
  }
  .field select:focus { outline: 2px solid #E95420; border-color: transparent; }
  .range-row { display: flex; align-items: center; gap: 8px; }
  .range-row input[type=range] { flex: 1; }
  .range-row .val { font-size: 12px; color: #888; min-width: 36px; text-align: right; }

  /* 9-point grid widget */
  .align-grid {
    display: grid; grid-template-columns: repeat(3, 32px); gap: 4px;
    justify-content: start;
  }
  .align-grid button {
    width: 32px; height: 32px; border-radius: 4px;
    border: 1px solid #444; background: #2a2a2a; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: all 0.15s;
  }
  .align-grid button:hover { border-color: #666; }
  .align-grid button.active { background: #E95420; border-color: #E95420; }
  .align-grid button .dot {
    width: 8px; height: 8px; border-radius: 50%;
    background: #666;
  }
  .align-grid button.active .dot { background: #fff; }

  .sizing-group { display: flex; gap: 4px; }
  .sizing-group button {
    flex: 1; padding: 6px 0; border-radius: 4px; font-size: 12px;
    font-weight: 600; cursor: pointer; border: 1px solid #444;
    background: #2a2a2a; color: #aaa; transition: all 0.15s;
  }
  .sizing-group button:hover { border-color: #666; }
  .sizing-group button.active { background: #E95420; border-color: #E95420; color: #fff; }

  .stage {
    display: flex; align-items: center; justify-content: center;
    padding: 32px; overflow: auto;
  }
  .stage svg { filter: drop-shadow(0 2px 8px rgba(0,0,0,0.3)); }

  .info {
    font-size: 12px; color: #666; line-height: 1.5;
    border-top: 1px solid #333; padding-top: 16px;
  }
</style>
</head>
<body>

<div class="controls">
  <h1>Auto-Layout Demo</h1>

  <div>
    <h2>Direction</h2>
    <div class="field">
      <select id="direction" onchange="update()">
        <option value="VERTICAL" selected>↓ Vertical (top → down)</option>
        <option value="HORIZONTAL">→ Horizontal (left → right)</option>
      </select>
    </div>
  </div>

  <div>
    <h2>Alignment (9-point)</h2>
    <div class="align-grid" id="alignGrid"></div>
  </div>

  <div>
    <h2>Children</h2>
    <div class="field">
      <label>Count</label>
      <select id="children" onchange="update()">
        <option value="1">1</option>
        <option value="2">2</option>
        <option value="3" selected>3</option>
      </select>
    </div>
  </div>

  <div>
    <h2>Child A sizing</h2>
    <div class="sizing-group" data-target="child_a_sizing">
      <button onclick="setSizing(this,'HUG')" class="active">HUG</button>
      <button onclick="setSizing(this,'FILL')">FILL</button>
    </div>
  </div>
  <div>
    <h2>Child B sizing</h2>
    <div class="sizing-group" data-target="child_b_sizing">
      <button onclick="setSizing(this,'HUG')" class="active">HUG</button>
      <button onclick="setSizing(this,'FILL')">FILL</button>
    </div>
  </div>
  <div>
    <h2>Child C sizing</h2>
    <div class="sizing-group" data-target="child_c_sizing">
      <button onclick="setSizing(this,'HUG')" class="active">HUG</button>
      <button onclick="setSizing(this,'FILL')">FILL</button>
    </div>
  </div>

  <div>
    <h2>Spacing</h2>
    <div class="field">
      <label>Gap</label>
      <div class="range-row">
        <input type="range" id="gap" min="0" max="48" step="8" value="24" oninput="updateRange(this); update()">
        <span class="val" id="gap_val">24</span>
      </div>
    </div>
    <div class="field">
      <label>Padding</label>
      <div class="range-row">
        <input type="range" id="padding" min="0" max="48" step="8" value="16" oninput="updateRange(this); update()">
        <span class="val" id="padding_val">16</span>
      </div>
    </div>
  </div>

  <div>
    <h2>Container size</h2>
    <div class="field">
      <label>Width</label>
      <div class="range-row">
        <input type="range" id="container_w" min="200" max="800" step="8" value="504" oninput="updateRange(this); update()">
        <span class="val" id="container_w_val">504</span>
      </div>
    </div>
    <div class="field">
      <label>Height</label>
      <div class="range-row">
        <input type="range" id="container_h" min="200" max="800" step="8" value="400" oninput="updateRange(this); update()">
        <span class="val" id="container_h_val">400</span>
      </div>
    </div>
  </div>

  <div class="info">
    Grid: 8px baseline. Orange badges = FILL sizing.<br>
    Dashed border = parent container. Dots = 8px grid.
  </div>
</div>

<div class="stage" id="stage">
  <!-- SVG rendered here -->
</div>

<script>
const ALIGNS = [
  'TOP_LEFT', 'TOP_CENTER', 'TOP_RIGHT',
  'CENTER_LEFT', 'CENTER', 'CENTER_RIGHT',
  'BOTTOM_LEFT', 'BOTTOM_CENTER', 'BOTTOM_RIGHT',
];
let currentAlign = 'TOP_LEFT';

// Build 9-point grid
const grid = document.getElementById('alignGrid');
ALIGNS.forEach(a => {
  const btn = document.createElement('button');
  btn.dataset.align = a;
  btn.title = a.replace('_', ' ');
  btn.innerHTML = '<span class="dot"></span>';
  if (a === currentAlign) btn.classList.add('active');
  btn.onclick = () => {
    grid.querySelectorAll('button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentAlign = a;
    update();
  };
  grid.appendChild(btn);
});

function setSizing(btn, value) {
  const group = btn.parentElement;
  group.querySelectorAll('button').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  update();
}

function getSizing(target) {
  const group = document.querySelector(`.sizing-group[data-target="${target}"]`);
  const active = group.querySelector('button.active');
  return active ? active.textContent : 'HUG';
}

function updateRange(el) {
  document.getElementById(el.id + '_val').textContent = el.value;
}

function update() {
  const params = new URLSearchParams({
    direction: document.getElementById('direction').value,
    align: currentAlign,
    gap: document.getElementById('gap').value,
    padding: document.getElementById('padding').value,
    children: document.getElementById('children').value,
    child_a_sizing: getSizing('child_a_sizing'),
    child_b_sizing: getSizing('child_b_sizing'),
    child_c_sizing: getSizing('child_c_sizing'),
    container_w: document.getElementById('container_w').value,
    container_h: document.getElementById('container_h').value,
  });

  fetch('/api/layout?' + params.toString())
    .then(r => r.text())
    .then(svg => {
      document.getElementById('stage').innerHTML = svg;
    });
}

// Initial render
update();
</script>
</body>
</html>"""


# ---------------------------------------------------------------------------
# HTTP server
# ---------------------------------------------------------------------------

class DemoHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed = urlparse(self.path)

        if parsed.path == '/' or parsed.path == '/index.html':
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.end_headers()
            self.wfile.write(PAGE_HTML.encode())

        elif parsed.path == '/api/layout':
            params = {}
            for k, v in parse_qs(parsed.query).items():
                params[k] = v[0]
            svg = compute_layout(params)
            self.send_response(200)
            self.send_header('Content-Type', 'image/svg+xml')
            self.send_header('Cache-Control', 'no-cache')
            self.end_headers()
            self.wfile.write(svg.encode())

        else:
            self.send_response(404)
            self.end_headers()

    def log_message(self, format, *args):
        pass  # Suppress request logging


def main():
    port = 8200
    server = HTTPServer(('127.0.0.1', port), DemoHandler)
    print(f'  [demo] Auto-layout demo at http://127.0.0.1:{port}')
    print(f'  [demo] Ctrl+C to stop')
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\n  [demo] stopped')


if __name__ == '__main__':
    main()
