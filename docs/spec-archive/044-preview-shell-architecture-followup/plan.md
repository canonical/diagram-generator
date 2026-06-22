# Implementation Plan: Preview shell architecture follow-up

**Branch**: `feat/044-preview-shell-architecture-followup` | **Date**: 2026-06-15 | **Spec**: [spec.md](spec.md)

## Goal

Take the repo from "extracted but globally wired" to a documented next-stage browser architecture with explicit shell contracts, bundle boundaries, and a decomposition path for remaining trap files.

## Slice order

1. Audit the current browser surface
2. Define the shell contract / registry shape
3. Define bundle boundaries and measurement checkpoints
4. Publish the `layout-bridge.js` staged decomposition map
5. Choose one small pilot only if the design needs proof

## Guardrails

- Do not reopen spec 043 for broad churn.
- Do not reintroduce Input / Output / Both compatibility UI.
- Prefer one narrow pilot over another sweeping extraction pass.
- Keep the contract compatible with spec 038 seams and standalone-repo operation.
