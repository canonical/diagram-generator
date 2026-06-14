# Inbox

Drop notes here. The agent will triage items into `TODO.md`, then empty this file back to its template header.

2) editor.js is nearly 6000 lines; we had a spec to make things modular, 035 iirc. we plan to port 20+ algorhythms; for this purpose the idea was to amke thnigs modular. so why is editor.js still one monolythic file? and why is it js rather than ts? explain, propose the best architecture, and write a spec-kit spec to fix it.

3) ELK follow-up handoff from the last chat cluster. Cold-start context:

- We clarified that the tree page is showing the authored frame/YAML structure, not the raw ELK graph. Containers like `row_main`, `juju_system`, `row_external_top`, `row_external_bottom` are authored by us, not invented by ELK.
- Current ELK policy should be selective flattening, not blanket flattening. Structural carrier wrappers should be flattened before passing the graph to ELK, but semantically real compounds that are direct arrow endpoints should stay native ELK compounds. `example-platform-architecture.yaml` is the concrete counterexample to "flatten everything": `frontend` and `services` need to remain real compounds/endpoints.
- If we want visibility here, add a debug view/toggle that shows:
  - authored tree
  - ELK input graph after flattening
  This should be a debug aid, not a persisted layout behavior toggle.
- On the "why do edges fan out where they do?" question: `elk.spacing.edgeNode` is only clearance between routed edges and node boxes; it is not the anchor/fan-out control. The ports themselves are fixed side-midpoints in the ELK input. More relevant controls are `elk.spacing.edgeEdge`, `elk.layered.spacing.edgeEdgeBetweenLayers`, and the input-side port choice policy.
- Reciprocal-edge behavior currently uses a second ELK pass that only changes `sourcePort` / `targetPort` refs based on the first pass; it does not rewrite routes after ELK. Keep it that way unless we can replace it with a cleaner native ELK option.
- Shared-stem / merged-fan-out is probably not a good fit for the current midpoint-port setup. ELK does have `mergeEdges`, but the official docs say it applies to edges without ports, so treat it cautiously before exposing or relying on it.
- Testing direction agreed in chat:
  - yes, add regression protection
  - no, do not build one giant brittle "all ELK options visibly affect one fixture" test
  - instead keep a small matrix of focused tests: option-surface contract tests plus a few targeted behavior fixtures
- Existing tests worth using as anchors for the next pass:
  - `packages/graph-layout-elk/tests/elk-layered.test.ts`
    - reciprocal pair gets alternate side ports without post-routing overrides
  - `packages/layout-engine/tests/elk-layout.test.ts`
    - headed compounds stay native
    - same-layer gap remains effective inside headed compounds
    - juju midpoint attachments stay on true side midpoints
  - `packages/layout-engine/tests/preview-engine-registry.test.ts`
    - dead ELK controls such as `elk.portConstraints` stay hidden
  - `packages/graph-layout-elk/tests/elk-force.test.ts`
    - force layout remains port-free

Concrete TODOs for the next chat:

- Audit whether any currently exposed ELK layered controls are effectively inert or too topology-dependent to present without caveat. Tighten descriptions or hide them if needed.
- Consider adding a debug/introspection view for "authored frame tree vs ELK input graph" so nesting/flattening behavior is visible during review.
- Add one stricter option-contract test so a newly exposed ELK control cannot slip into the UI/save surface without matching coverage.
- Re-check whether the reciprocal-edge alternate-port pass should remain heuristic or whether a cleaner native ELK-side configuration exists for a subset of cases.

I) we need to run harfbuzz every time a box changes width manuall - right now i make a box wider, but text inside it stays wrap even though it would fit
II) interactive resizing is incredibly slow, only activates on dropping a resize handle, not interactively; we switched from python to ts to allow more interactive fast controls as in figma, why is that not working?
III) elk has a lot of promise, maybe to even replace our v3 engine; but right now resiing is very unpredictable. ![ these are all set to fill now, and they dont fill; setting items to same size doesnt make them same ize. is there a way to do it without breakign the elk algo? surely, wit can handle items with explicit size right?](image-7.png)


reent regression: ![alt text](image-9.png) space above text in frames varies; especially the parent variant - se how it is coloser to the edge. happens in elk layouts, compare with v3 and you'll find it is different