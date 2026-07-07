# Plan: Spec 076 TLS certificate provider Mermaid cold-start fit

## Working theory

The TLS certificate provider topology does not currently argue for restoring
Dagre. It argues that we are comparing two different problem shapes:

1. The likely source shape is a Mermaid flowchart with ordered `subgraph`
   clusters, which Mermaid normally lays out with Dagre.
2. The current in-repo shape is a canonical frame YAML fixture lowered into
   fill-sized carriers and helper rows, which the preview-engine compatibility
   gate correctly withholds from ELK today.

So the immediate work is not "switch engines." The immediate work is:

1. preserve the example as a cold-start pack
2. recreate the likely Mermaid source in the sibling repo
3. document the exact current blocker in this repo
4. force future fixes to choose honestly between `v3`-only classification and a
   cluster-preserving lowering/shim before ELK

The specific review question is now explicit:

- is Dagre actually the missing solution for this example?
- or is the real fix better structured YAML / better Mermaid-to-YAML lowering?

## Likely file map

- Canonical fixture:
  `scripts/diagrams/frames/tls-certificate-provider-topology.yaml`
- Current compatibility owner:
  `packages/layout-engine/src/preview-engine/registry.ts`
- Future fixture-owned compatibility / fidelity tests:
  `packages/layout-engine/tests/preview-engine-registry.test.ts` or
  `preview-engine-fidelity-probes.test.ts`
- Cross-repo recreation handoff:
  `../mermaid/AGENT-INBOX.md`
- Mermaid-side source of truth once added there:
  sibling `../mermaid/examples/...`
- This package's cold-start assets:
  `docs/spec-archive/076-tls-mermaid-cold-start-fit/images/` and `references/`

## Investigation protocol

1. Start from the source image, not the YAML.
   - Inspect `images/01-source-mermaid-reference.png`.
   - Treat it as the "before" source truth image.
   - Treat the draft Mermaid file as a first-pass hypothesis, not ground truth.
2. Inspect the downstream attempts in order.
   - `images/02-engineer-elk-force-attempt.png` is the field engineer's
     external ELK-force attempt, not the canonical in-repo comparison.
   - `images/03-current-v3-render.png`,
     `images/04-current-elk-layered-render.png`, and
     `images/05-current-elk-force-render.png` are the controlled in-repo
     comparison set from the same YAML fixture.
3. Compare the three relevant shapes.
   - Mermaid-origin cluster layout intent
   - current canonical YAML structure
   - current ELK compatibility rules
4. Keep the blocker diagnosis precise.
   - confirm fill carriers are the current reason ELK is withheld
   - confirm the example is not disqualified by deep nesting
   - confirm the arrow graph itself is tree-shaped
5. Evaluate the failure reasoning, not just the screenshots.
   - confirm whether `elk-force` fails because it is the wrong algorithm family
   - confirm whether `elk-layered` fails because the current lowered YAML loses
     cluster/subgraph intent and replaces it with fill carriers/helper rows
6. Separate the design choices.
   - algorithm-class consolidation from spec 074
   - example-specific lowering/compatibility in this spec
7. Before any implementation claims success, define the regression shape first.
   - compatibility probe on this fixture
   - geometry probe for the cluster/ordering expectations if ELK is enabled

## Verification shape

- Cold-start artifact verification:
  - images exist in this package
  - Mermaid draft exists in this package
  - canonical YAML fixture exists in product path
- Cross-repo handoff verification:
  - `../mermaid/AGENT-INBOX.md` contains the request and asset paths
- Current-state regression to add during implementation:
  - a fixture-owned compatibility test that asserts `v3` only until changed
- Future-state regression required for any ELK claim:
  - the fixture becomes `elk-layered`-compatible on purpose
  - a regression proves the intended cluster/ordering result, not just that ELK
    can render *something*
- Opus decision verification:
  - the review must answer "Dagre or better structured YAML/lowering?"
  - if the answer is Dagre, the missing capability must be named concretely
  - if the answer is better lowering, the blocking shape loss must be named
    concretely

## Sequencing note

This is intentionally example-first and investigation-first. Do not let the
spec collapse into "ELK layered should be close enough because Dagre was
removed." The required sequence is:

1. preserve the example
2. recreate it in Mermaid
3. classify the current blocker honestly
4. only then decide unsupported vs lowering/shim
