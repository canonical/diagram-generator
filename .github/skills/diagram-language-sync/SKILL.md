---
name: diagram-language-sync
description: "Sync broader design-language specs into the diagram system. Use when importing typography, spacing, or grid rules from the upstream design language into tokens.ts, shared renderer constants, draw.io style sync, or layout helpers."
argument-hint: "Describe the upstream spec source and which token families are changing"
---

# Diagram language sync

## When to use

- The broader design language changed typography, spacing, or grid rules.
- Renderer constants need to absorb upstream design-system values.
- draw.io style defaults need to reflect new spacing or type decisions.

## Procedure

1. Read the upstream design-language source, then read `packages/layout-engine/src/tokens.ts` and `packages/layout-engine/src/frame-classes.ts`. Read draw.io scripts only if the change affects draw.io outputs.
2. Update **code constants first** in TypeScript.
3. Update `DIAGRAM.md` only if the public-facing diagram contract changed.
4. Rebuild outputs with the `diagram-build-validate` skill.
5. Audit changed diagrams specifically for text ascent, line spacing, box growth, connector spacing, and icon padding regressions.
6. Record any newly generalized mapping rules in `DIAGRAM.md` only when the public diagram contract changed; otherwise leave them in code or note durable follow-up in `TODO.md` / `AGENT-INBOX.md`.

## Guardrails

- Do not let `DIAGRAM.md` contradict `tokens.ts` / `frame-classes.ts`.
- Keep imported values explicit; avoid burying new design-language rules in chat-only rationale.
- Prefer one source-to-token mapping over per-diagram overrides.
- Unless the user explicitly asks for another tier, keep the repo aligned to the current diagram pilot: `18px` body text, `8px` baseline unit, `24px` line step, and `24px` structural gutters.
