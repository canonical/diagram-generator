# Spec 075 adversarial review — preview folder workspaces

Date: 2026-07-13
Scope: Phase 0 and Phase 1 server slice (`97f1284`, `b4ecffc`)
Base: `main` (`ae003b6`)
Reviewer: Codex

## Verdict

**Changes required before Phase 0+1 closeout.** The typed server-root adapter and ordinary qualified viewer/API paths are directionally sound, and the existing source-level persistence and containment tests cover useful foundations. The slice nevertheless has a real qualified-export regression, an inconsistent malformed-address policy, and no repo-owned persistence regression through the registered preview save/read routes. The known Chromium layout-bucket failure was reproduced as the documented baseline flake and is not attributed to this work.

## Findings

### HIGH — encoded qualified slugs are lost by SVG and drawio export route parsing

Location: `apps/preview/src/preview-host/builtin-autolayout-host.ts:72-89`, wired at `:183-196`.

The normal API route matcher decodes a path component, but the SVG and drawio route-specific `resolveSlug` functions re-read `match.pathname` and strip the suffix without decoding it. A request such as `/v3/svg/other%3Ashared-onbrand-v3.svg` therefore reaches workspace resolution as `other%3Ashared` instead of `other:shared`. Literal-colon paths work; browser-generated percent-encoded paths do not reliably address the non-default root. Because the downstream resolver is optional/fallback-based, this can become a default-root lookup rather than a clean qualified-source miss.

Impact: qualified export round-tripping is not equivalent across viewer, JSON API, SVG, and drawio paths, violating the Phase 1 source-address contract.

Required fix: decode the export filename component safely before suffix removal, reject decoded separators/invalid encoding, and add encoded qualified SVG and drawio route coverage.

### HIGH — a failed source resolution falls through to the historical default directory

Locations: `apps/preview/src/preview-host/document-apis.ts:54-64` and `apps/preview/src/preview-host/builtin-autolayout-host.ts:218-229`.

When a resolver is present but returns `null` for an unknown source, an unknown qualified address, or a malformed address, document, render, save, and viewer code silently reuses the original default-directory dependencies and raw slug. That bypasses the `DiagramWorkspaceSource` boundary and its bare-slug/realpath checks. The current HTTP normalizer rejects slash-containing traversal strings, so I found no direct HTTP traversal escape in this slice; the issue is still a source-identity and defense-in-depth bypass, and it makes malformed addresses capable of being interpreted as default-root filenames.

Required fix: preserve historical fallback only when no resolver was supplied (legacy narrow test helpers); when a resolver is supplied, treat `null` as unresolved and make the viewer/API route return its normal missing-document response.

### MEDIUM — `WorkspaceRegistry.resolve` does not reject malformed colon addresses

Location: `apps/preview/src/preview-host/workspace/workspace-registry.ts:58-75`.

The method documentation says malformed addresses resolve to `null`, but any string that fails `parseQualifiedSlug` is treated as a bare slug. Thus `a:b:c` is routed to the default source instead of being rejected. This compounds the failed-resolution fallback above and makes the registry’s documented contract false.

Required fix: if an address contains `:`, require a valid qualified parse; otherwise return `null`. Add a regression test for malformed and unknown qualified addresses.

### MEDIUM — persistence coverage stops at the source adapter

Location: `apps/preview/src/persistence/workspace-source.test.ts:109-119` and `:219-237`.

The existing `persist -> reload` tests prove direct source/registry behavior, but no repo-owned test drives the registered preview save endpoint with a qualified address and then reloads through a preview read endpoint. Because save path selection is request-boundary behavior, this leaves the most important Phase 1 integration seam unverified.

Required fix: add a route-level regression that saves `other:diagram` through the registered preview endpoint, asserts the YAML changed only in the other root, then reads the document back through the registered endpoint.

## Positive checks

- `createServerRootSource` applies realpath containment to existing and symlinked files and rejects separators, absolute paths, and `..` slugs.
- The default source preserves bare viewer links while additional roots are listed with qualified IDs.
- Ordinary viewer, JSON document, SVG, and drawio routes use the registered host/module path rather than a new server-local branch.
- Duplicate basenames remain distinct in the aggregate listing.

## Verification performed

- `npm --prefix apps/preview test`: 176 passing, 1 skipped (Windows symlink capability), 1 failing known Chromium flake in `editor-live-repaint-regression.test.ts` (“engine-specific layout buckets…”). The same failure is documented as occurring on `main`; it was not used as evidence against Spec 075.
- The Phase 1 source tests pass, including two-root listing, qualified resolution, source-level persistence, and containment checks.
- The review was limited to the server slice requested by the review prompt; local-folder work, external-change handling, security documentation, T012 section headers, and T014 bundled-example splitting were not treated as missing implementation.

## Remediation status

The findings in this review were addressed on `feat/075-preview-folder-workspaces`: export route filenames are decoded and separator-checked, resolver `null` no longer falls through when workspace routing is configured, malformed colon addresses are rejected by the registry, and the registered host contract now covers encoded qualified preview/save/reload plus SVG/drawio exports. The full-suite failure remains the known unrelated Chromium flake described above.
