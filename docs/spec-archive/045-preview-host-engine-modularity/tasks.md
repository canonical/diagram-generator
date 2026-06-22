# Tasks: Preview host engine modularity

**Input**: Design documents from `/specs/045-preview-host-engine-modularity/`

## Phase 1 - Host descriptors and shared page shell

- [x] T001 Define typed preview-host lane descriptors for the current grid and force lanes
- [x] T002 Extract shared viewer/index page-shell assembly into `apps/preview/src/preview-host/`
- [x] T003 Add focused preview-host contract coverage for lane descriptors and page assembly

## Phase 2 - Server modularity

- [x] T010 Route current grid and force page builders through the typed preview-host contract end-to-end
- [x] T011 Continue shrinking `apps/preview/src/server.ts` by moving route and page concerns into preview-host modules
- [x] T012 Refresh route ownership notes and cold-start guidance once the next server extraction slice lands

## Phase 3 - Engine scale readiness

- [x] T020 Define the minimal host work required to onboard a future non-force lane without bespoke server branching
- [x] T021 Record preview-host lane tiers and the host-vs-browser-shell boundary so lane registration does not turn into a fake plugin system
- [x] T022 Keep the preview-host contract aligned with spec 035 engine compatibility and spec 044 browser contracts
