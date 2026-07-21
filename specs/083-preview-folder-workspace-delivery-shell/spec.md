# Spec 083: Preview folder-workspace delivery shell

**Status**: Draft — not started. Successor to Spec 075, created by the
2026-07-20 Opus UX/delivery review
([findings](../../docs/spec-reviews/opus-adversarial-review-findings-2026-07-20-spec-075-ux-delivery.md),
finding D1).
**Created**: 2026-07-20
**Depends on**: Spec 075 (merged on `main`) closed out first.

## Problem

Spec 075 delivers the in-browser folder workflow (open a folder → grouped
sidebar → canvas → handle-gated save back to that folder). But a non-repo user
cannot reach that workflow without a developer setup: `npm run preview` requires
a Git checkout, `npm install`, and a Node/nvm toolchain
(`package.json`, `apps/preview/package.json`). Spec 075 explicitly non-goaled a
packaged desktop shell and deferred this in its open question #1.

The target the 075 review measured against — "work for a non-repo user without
terminal setup beyond launching the preview" — is therefore not yet delivered.
This spec owns closing that gap without re-opening 075's in-app UX, which is done.

## Goals (to refine at plan time)

- A non-developer can launch the preview and reach the folder workflow without
  cloning the repo or running package-manager or toolchain commands.
- Keep the local-first, no-central-server model from 075 intact.
- Reuse the existing TypeScript preview host and browser bundle unchanged; this
  is a packaging/launch concern, not a re-implementation of the editor.

## Non-goals

- No change to the 075 source abstraction, save contract, or in-app UX.
- No hosted SaaS, account system, or central diagram store (unchanged from 075).
- No new behaviour-heavy logic under `scripts/preview/*.js`.

## Open questions (resolve at plan time)

1. Packaged desktop shell (e.g. Electron/Tauri) vs. a single-binary local server
   launcher vs. a documented one-command installer — which is the smallest
   useful delivery for the intended audience?
2. How are the browser bundle and assets embedded/refreshed so the shell does
   not require a build step on the user's machine?
3. Auto-update / versioning expectations, if any.
4. Which OSes are in scope for the first release?

## Status note

Draft only. Do not start product work until Spec 075 is closed out (its T045
native-picker/regrant evidence lands) and this spec is planned on a matching
`feat/083-preview-folder-workspace-delivery-shell` branch.
