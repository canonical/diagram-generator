import test from "node:test";
import assert from "node:assert/strict";

import { AUTOLAYOUT_HOST_LANE, FORCE_HOST_LANE, buildPreviewBrowseSections } from "../preview-host/lanes.js";
import { buildIndexPageHtml, buildViewerPageHtml } from "../preview-host/pages.js";

test("preview host lane descriptors build typed browse sections", () => {
  const sections = buildPreviewBrowseSections([
    { lane: AUTOLAYOUT_HOST_LANE, slugs: ["support-engineering-flow"] },
    { lane: FORCE_HOST_LANE, slugs: ["force-stakeholders"] },
  ]);

  assert.deepEqual(sections, [
    {
      key: "autolayout",
      label: "Autolayout",
      links: [{ href: "/view/v3:support-engineering-flow", label: "support-engineering-flow" }],
    },
    {
      key: "force",
      label: "Force demos",
      links: [{ href: "/force/view/force-stakeholders", label: "force-stakeholders" }],
    },
  ]);
});

test("preview viewer page HTML is assembled from typed host sections", () => {
  const html = buildViewerPageHtml({
    title: "support-engineering-flow – diagram preview",
    mode: "grid",
    currentPath: "/view/v3:support-engineering-flow",
    templateHtml: [
      "%TITLE%",
      "%BF_STYLES%",
      "%MODE%",
      "%NAV_OPTIONS%",
      "%BROWSE_NAV%",
      "%INSPECTOR_EMPTY%",
      "%MODE_SCRIPTS%",
      "%CONFIG_SCRIPT%",
      "%ELK_SECTION_HIDDEN%",
      "%UNUSED_PLACEHOLDER%",
    ].join("\n"),
    browseSections: buildPreviewBrowseSections([
      { lane: AUTOLAYOUT_HOST_LANE, slugs: ["support-engineering-flow"] },
      { lane: FORCE_HOST_LANE, slugs: ["force-stakeholders"] },
    ]),
    inspectorEmptyText: "Click a component to inspect it.",
    modeScriptsHtml: '<script src="/preview/editor.js"></script>',
    configScript: "window.__DG_CONFIG = {};",
    includeElkSection: true,
    baselineStylesHtml: '<link rel="stylesheet" href="/preview/bf-os.css">',
  });

  assert.match(html, /support-engineering-flow – diagram preview/);
  assert.match(html, /<optgroup label="Autolayout">/);
  assert.match(html, /value="\/view\/v3:support-engineering-flow" selected/);
  assert.match(html, /dg-browse-link is-active/);
  assert.match(html, /window\.__DG_CONFIG = \{\};/);
  assert.equal(html.includes("%UNUSED_PLACEHOLDER%"), false);
});

test("preview index page HTML renders browse sections without server-local string assembly", () => {
  const html = buildIndexPageHtml({
    port: 8100,
    specHome: "specs/045-preview-host-engine-modularity/",
    browseSections: buildPreviewBrowseSections([
      { lane: AUTOLAYOUT_HOST_LANE, slugs: ["alpha"] },
      { lane: FORCE_HOST_LANE, slugs: ["beta"] },
    ]),
    baselineStylesHtml: '<link rel="stylesheet" href="/preview/bf-os.css">',
  });

  assert.match(html, /Node preview app on port 8100/);
  assert.match(html, /specs\/045-preview-host-engine-modularity\//);
  assert.match(html, /href="\/view\/v3:alpha"/);
  assert.match(html, /href="\/force\/view\/beta"/);
});
