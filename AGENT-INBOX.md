# Agent Inbox

Machine-generated handoffs, long diagnostics, and cross-repo follow-up notes go here.

Do not use this file for user notes. User-authored async notes belong in `INBOX.md`.

The agent should triage anything durable from this file into `TODO.md`, `STATUS.md`, `HISTORY.md`, or `docs/specs.md`, then empty this file back to this header template.




/// see below keep this here until told otherwise, dont drain it; it is an analysis of what can be done by what engines fro mchatgpt 5.5 mini. I think the enxt step would be to fix specs like the 018 one - it should say ts or similar, unless that adds significant complexity; we need to proceed and this order seems good, but worth verifying as it is a mini model;

// user prompt:
audit the specs before 038 - the ones we havent fully closed or started yet. do they contradict anything in the new pivot plan ion spec 038?
then, write here, how would you rank the tasks in tasks.md - which ones require frontier models, whic hones can be done with lower tier or auto mode

//gpt5.5 mini reply:
Optimized tool selection

I’ve got the spec authored; next I’m checking the repo state, committing the new spec set, and then I’ll audit the pre-038 specs for any conflicts with the new pivot.

The worktree already has unrelated edits, so I’m committing only the three new spec-038 files and leaving the rest untouched.

The commit is in. I’m now auditing the pre-038 specs that are still open or partially open, to see whether any of them conflict with the new TS-only pivot plan.

That first probe missed the actual spec names. I’m listing the spec folders and then reading the open ones directly.

I’ve confirmed the active queue: the open pre-038 work is mostly 006, 018, 024, and the proposed-but-not-started 031–034. I’m reading the spec headers now so I can say which ones actually conflict with the new pivot and which ones just need to be sequenced around it.

The not-started 031–034 entries are just TODO ideas right now — there are no spec folders yet, so they can't contradict 038 because they don't exist as specs. I’m checking spec 035 as well, since it is an actual folder before 038 and may be the only other candidate for conflict.

Committed the spec-kit files as commit 20b2cb7 with message docs: add spec 038 pivot plan.

Audit result: only one open pre-038 spec is in direct tension with the new pivot plan. spec 018 still centers a Python CLI path (python scripts/export_png.py) and preview/batch PNG plumbing that would conflict with 038’s no-Python product-path rule unless it is re-scoped to TS/Node. The others are mostly compatible or just need sequencing:

spec 006 is aligned; it is already TS-first and renderer-owned geometry.
spec 024 is compatible; it assumes the preview architecture 038 keeps, so it should just wait until the Node front door exists.
spec 035 is also compatible and actually fits the pivot, but it depends on the preview-engine contract and a stable multi-engine Node preview surface, so it should follow Phase 0/1 of 038.
specs 031-034 are not started as actual spec folders yet, so they do not contradict 038 as specs; they already point in the same TS-first direction.
specs 036-037 are already closed and do not conflict.
For task tiering in spec 038 tasks, I’d rank them like this:

Frontier / heavy:

T010, T011, T013
T030, T031, T032, T033, T034, T035
Lower tier / standard:

T001, T002, T003, T004, T005, T006, T007
T012, T014, T015, T016
T019, T020, T021, T022, T023
T040, T050, T051
Auto / validation:

T017, T018
Practical read: the dangerous work is the Node preview app plus the engine-seam refactor. The docs/ratchet/cleanup tasks can be handled by lower-tier or auto-mode work, and the browser/pytest checks are validation, not model-heavy reasoning.