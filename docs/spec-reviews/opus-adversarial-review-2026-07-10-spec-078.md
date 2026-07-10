# Opus Adversarial Review Prompt — Spec 078 Figma autolayout plugin

Use this prompt with a single Opus review pass against branch
`feat/078-figma-autolayout-plugin`.

```text
Familiarize yourself with the `diagram-generator` repo, then perform a strict
adversarial review of spec 078 and its implementation.

This is not a self-review request. Review the branch as an external, skeptical
engineer. Prioritize real bugs, false validation, architecture drift, stale
status claims, and places where green tests could still hide broken Figma
behavior.

Current review target:
- Branch: `feat/078-figma-autolayout-plugin`
- Spec package: `specs/078-figma-autolayout-plugin/`
- Prior review file: `docs/spec-reviews/078-figma-autolayout-plugin.md`
- Closeout evidence: `specs/078-figma-autolayout-plugin/validation.md`

What changed at a high level:
- Added `apps/figma-plugin/`, a local-development Figma Design plugin.
- The plugin imports a canonical leaf and full frame-diagram payloads served
  from local YAML via `apps/figma-plugin/src/dev-server.ts`.
- The payload server consumes `layoutFrameTree(...).coerced` and serializes
  effective Figma sizing rather than raw authored YAML sizing.
- The payload server downgrades Figma-illegal fill-under-hug to fixed-at-placed.
- The Figma builder no longer performs client-side parent-axis coercion.
- The Figma builder reads back actual `layoutSizingHorizontal` /
  `layoutSizingVertical` values and fails import if Figma rejects or changes the
  effective payload sizing.

Read first:
- `AGENTS.md`
- `AGENT-INBOX.md`
- `docs/agent-index.md`
- `docs/specs.md`
- `specs/078-figma-autolayout-plugin/spec.md`
- `specs/078-figma-autolayout-plugin/plan.md`
- `specs/078-figma-autolayout-plugin/tasks.md`
- `specs/078-figma-autolayout-plugin/validation.md`
- `docs/spec-reviews/078-figma-autolayout-plugin.md`

Then inspect the implementation owners:
- `apps/figma-plugin/src/dev-server.ts`
- `apps/figma-plugin/src/dev-server.test.ts`
- `apps/figma-plugin/src/code.ts`
- `apps/figma-plugin/src/code.test.ts`
- `apps/figma-plugin/package.json`
- `packages/layout-engine/src/heading-synthesis.ts`
- `packages/layout-engine/src/index.ts`
- `packages/layout-engine/src/frame-model.ts`
- `packages/layout-engine/src/layout.ts`

Review goals:
1. Verify the decisive ROUND 3 fix is real:
   - `dev-server.ts` captures `layoutFrameTree(...).coerced`
   - serialized node/body sizing uses effective layout state
   - root/body measured geometry is not guessed
   - the telecom payload contains no `FILL` child under a `HUG` parent
2. Verify the Figma client is no longer hiding payload faults:
   - no remaining client-side parent-axis coercion that masks illegal payloads
   - import success requires real Figma readback to match payload sizing
   - rejected sizing assignments fail loudly enough for a user to diagnose
3. Verify preview/YAML/Figma parity:
   - browser overrides saved to YAML flow through the layout engine before Figma
   - `ai-infra-telecom-services-stack` representative nodes match the effective
     preview state, especially `services_layer`, `ai_workflows`,
     `compute_nodes`, and `whitebox_switches`
4. Check test honesty:
   - tests fail on the old raw-payload bug
   - fake Figma does not merely accept strings without modeling Figma legality
   - there is no false-green path where a bad payload imports successfully
5. Check architecture:
   - new behavior is in TypeScript product paths, not `scripts/preview/*.js`
   - layout-engine-owned helpers are used instead of duplicating heading/body
     semantics or token magic
   - the plugin is a consumer of layout semantics, not a second layout engine
6. Check docs/status honesty:
   - `docs/specs.md`, `AGENT-INBOX.md`, spec files, and validation evidence do
     not overclaim live Figma verification
   - open residuals such as text over-nesting or component ergonomics are either
     fixed or honestly deferred
7. Check merge readiness:
   - no stale dev server/process assumptions
   - no generated/dist artifacts accidentally committed
   - no unrelated frame YAML reformat or inbox noise

Important constraints:
- Do not spend time praising what looks good.
- Treat "Closeout Ready" as a claim to verify, not trust.
- Do not accept "the payload looks right" unless Figma-client readback and tests
  prove the actual imported nodes keep the sizing.
- If live Figma/MCP is unavailable, say exactly what could not be inspected and
  judge whether repo-owned readback validation is sufficient.

Deliverable format:
- Findings first, ordered by severity.
- Each finding must include:
  - severity (`P0`, `P1`, `P2`, or `P3`)
  - file path(s)
  - exact reason it is a real problem
  - likely user or maintainer impact
- Then include:
  - `Open questions / assumptions`
  - `Status honesty check`
  - `Merge recommendation`
  - `Residual risks acceptable vs blocking`

If you find no material issues, say so explicitly, but still include test gaps,
manual verification gaps, and any deferred follow-up work.
```
