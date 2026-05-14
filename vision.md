

# Diagram System — Product Vision (v0.2)

> Source: meeting notes 2026-05-14.  
> Previous versions: `docs/vision/vision-raw-meeting-notes-2026-05-14.md` (raw), `docs/vision/vision-v0.1-structured.md` (first structured pass).  
> Related: `docs/project-proposal.md` (stakeholder-facing proposal with phased rollout, metrics, stakeholders).  
> Supporting analysis: `docs/vision/gap-analysis-2026-05-14.md`, `docs/vision/competitive-benchmark-2026-05-14.md`, `docs/vision/jira-epic-plan-2026-05-14.md`.

---

## 1. Problem

Canonical's public-facing materials contain diagrams produced ad-hoc across disconnected tools: Excalidraw, draw.io, screenshots, hand-drawn. No shared grammar, no composition rules, no pipeline from intent to on-brand output. The result: visual inconsistency, maintenance burden, and no way for editors (TAs) to patch diagrams without re-creating them.

## 2. Product definition

### What this is

A **diagram system** — not a single tool. Five layers:

| # | Layer | Description | Status |
|---|-------|-------------|--------|
| 1 | **Visual grammar** | Tokens, shapes, colors, spacing rules that constrain variation | **Exists** (`DIAGRAM.md`) |
| 2 | **Conceptual layer** | Semantic mapping: "what does a flowchart / architecture / relationship diagram look like in this system?" | **MISSING** — undefined |
| 3 | **Compositor** | Rules for nesting, grouping, overlap, strong/weak relationships, allowed/disallowed connections | **MISSING** — current failures: overlapping shapes, ambiguous containment |
| 4 | **Authoring pipeline** | Input → process → on-brand output, with controlled variation | **Partial** — v1/v2 build scripts exist but developer-operated, no self-service |
| 5 | **Enablement** | Guidelines, examples, domain templates, complexity mitigation | **MISSING** |

### What this is not

- Not a full interactive data-viz platform (no D3-scale interactivity).
- Not a replacement for all diagramming. Scope = public-facing documentation output.
- Not targeting internal/draft diagrams in v1.

## 3. Target audiences

Ordered by adoption priority, not by volume.

| # | Audience | Why this order | Key constraint |
|---|----------|---------------|----------------|
| 1 | **PMs** | Natural first adopters; produce diagrams for product pages and proposals | Need quick turnaround, not deeply technical |
| 2 | **Doc authors** (engineers writing docs) | Highest volume; write the content users actually read | Output must be editable and versionable, not binary blobs |
| 3 | **TAs (Technical Authors)** | Gatekeepers of doc standards — if TAs adopt, it becomes the org standard | **Must be patchable.** No screenshots, no opaque formats. Political constraint: avoid things that change often. Key contact: Teodora. |
| 4 | **Engineers** (Excalidraw users) | Lowest priority; hardest to move off existing tools | Will only switch if it's faster than what they have |

### **[GAP]** Audience prioritization vs. adoption leverage

PMs are listed first but TAs are the adoption lever. If TAs won't adopt, PM adoption alone doesn't create an org standard. The sequencing assumes PM usage generates proof that convinces TAs — **is that actually true?** What if TAs need to be co-designers of the tool constraints from day 1?

## 4. Authoring standard & toolchain

### Current state

Mermaid is the documentation standard. It's too limited for complex diagrams.

### Options on the table

| Option | Pros | Cons | Decision status |
|--------|------|------|----------------|
| **Mermaid** | Current standard, Sphinx plugin, widely known | Too limited for compositional diagrams | Default, acknowledged as insufficient |
| **D2** | More expressive, text-based | Smaller ecosystem, maturity unclear | **[NEEDS EVALUATION]** |
| **Custom Sphinx plugin** | Integrates into existing doc build | Maintenance burden, scope unclear | **[NEEDS EVALUATION]** |

### Hard requirement

Output must be patchable — editable text or structured data. This rules out any pipeline that only produces raster.

### **[BLOCKER]** Toolchain decision blocks architecture

The D2 vs. Mermaid-extension vs. custom-plugin decision is not made. Everything downstream — pipeline architecture, Sphinx integration, authoring UX — depends on this. **This needs a timeboxed evaluation before other work can be confidently scoped.**

### **[GAP]** Missing: evaluation criteria

No criteria defined for how to compare the options. Suggested starting set:
- Expressiveness: can it represent all five diagram types in the conceptual layer?
- Patchability: can a TA edit the source text and re-render?
- Sphinx integration: how much glue code?
- Ecosystem stability: is it maintained? Breaking changes?
- Learning curve: how long before a PM can produce a diagram?

## 5. Complexity model

Meeting mentioned "complexity bucketing" but didn't define tiers.

### **[UNCLEAR]** Needs definition

- What are the tiers? (e.g., Simple / Moderate / Complex / Out-of-scope)
- What's the ceiling — what complexity does the system refuse to handle?
- Hard constraints (system blocks) vs. soft constraints (system warns)?
- What does "too complex" look like in concrete examples?

### Complexity mitigation (agreed direction)

"This diagram is too complex" → system provides guidance on simplification. Doesn't need to be AI. Can be examples, decision trees, or editorial guidelines.

## 6. Composition & relationships

### Compositor (missing)

No rules for:
- Nesting (boxes inside boxes)
- Grouping (dashed frames, substrates)
- Overlap representation
- Strong vs. weak relationships
- Allowed vs. disallowed connections

### Relationship types (missing)

Hartmut raised a Venn-diagram reference for representing multiple belonging and overlap. No formal model exists.

### **[GAP]** No relationship taxonomy

Before the compositor can be built, someone needs to enumerate the relationship types that appear in real Canonical diagrams. Without this, the compositor will be designed from theory rather than observed need.

## 7. AI-assisted features

### Diagram suggestion from content

"Point it to a page, then AI suggests which passages to do as diagrams."

### **[UNCLEAR]** Scope boundary

- Is this v1 or future?
- What level? (Highlight candidate passages? Generate draft diagrams? Both?)
- What happens when suggestions are wrong?
- Who validates AI output — the author? An editor?

### **[GAP]** AI scope has high cost variance

If AI suggestion is in v1, the project roughly doubles in complexity. If it's deferred, it's a clean phase-2 feature. **The meeting didn't make this call.** Recommend: explicitly defer to phase 2, or define a minimal viable AI feature (e.g., "highlight passages only, no generation").

## 8. Interactivity

Agreed direction: "measured" — more than static SVG, less than D3.

### **[UNCLEAR]** No concrete features defined

The word "measured" appeared but no specific features were agreed. Candidates:
- Hover tooltips
- Expand/collapse groups
- Click-through to doc sections
- Pan/zoom on large diagrams
- None of the above (just programmatic text-to-SVG with no runtime JS)

### **[GAP]** Interactivity intersects toolchain

If the answer is "tooltips + expand/collapse," the output format must support JS or web components. If the answer is "none," SVG is sufficient. This can't be decided independently of the toolchain evaluation (§4).

## 9. Execution sequence (proposed)

From the meeting, roughly:

| Phase | Work | Depends on |
|-------|------|-----------|
| 0 | **Scope agreement** — what's v1 vs. later | — |
| 1 | **Toolchain evaluation** — D2 / Mermaid / custom plugin | Phase 0 |
| 2 | **Conceptual layer** — semantic diagram types mapped to the visual grammar | Phase 0 |
| 3 | **Compositor** — composition + relationship rules | Phase 2 |
| 4 | **Pipeline** — author-facing input → on-brand output | Phases 1, 3 |
| 5 | **Enablement** — guidelines, examples, domain templates, complexity guidance | Phases 2, 3, 4 |
| 6 | **AI features** (if scoped) | Phase 4 |

### **[GAP]** No milestones, no sizing

The sequence is logical but has no time estimates, milestone definitions, or team allocation. Turning this into a Jira epic requires sizing at least the evaluation and conceptual-layer phases.

## 10. Open questions

Grouped by urgency.

### Must answer before epic creation

| # | Question | Why it blocks |
|---|----------|--------------|
| 1 | D2 vs. Mermaid-extension vs. custom plugin? | Determines technical architecture |
| 2 | What are the complexity buckets? | Scopes what v1 handles |
| 3 | Is AI suggestion in v1? | Major cost/scope difference |
| 4 | What does "measured interactivity" mean concretely? | Determines output format and frontend complexity |

### Must answer before building

| # | Question | Why it matters |
|---|----------|---------------|
| 5 | What diagram types do engineers actually make? | Informs conceptual layer |
| 6 | What is the relationship model? (Hartmut's Venn reference) | Core compositor input |
| 7 | Which limitations are hard vs. soft? | Defines system behavior |
| 8 | Who owns Sphinx integration? | Team dependency |

### Must answer before rollout

| # | Question | Why it matters |
|---|----------|---------------|
| 9 | Is Teodora representative of TAs or an outlier? | If outlier, TA adoption is harder than assumed |
| 10 | What's the PM onboarding path? | First audience needs a first-run experience |

## 11. Risks

| Risk | Severity | Notes |
|------|----------|-------|
| Building the pipeline before the conceptual layer is defined | **High** | Will reproduce current ad-hoc problems with better tooling |
| Toolchain decision deferred indefinitely | **High** | Blocks architecture; timeboxed eval needed |
| AI suggestion in v1 dominates scope | **High** | Recommend explicit deferral or tight scoping |
| TA adoption hinges on one contact (Teodora) | **Medium** | Validate with broader TA group early |
| "Measured interactivity" stays vague → scope creep | **Medium** | Define concrete features for v1 |
| No user research on what diagrams people actually need | **Medium** | Risk of building a grammar for diagram types nobody uses |
| Visual grammar assumed solid but untested at scale | **Low** | `DIAGRAM.md` works for current repo; unclear if it generalizes |

## 12. Assumptions (stated or implied)

These were taken as given in the meeting. Flagging so they can be validated:

1. The visual grammar from `DIAGRAM.md` is solid enough to build on.
2. PMs are the right starting audience.
3. TAs will adopt if patchability is met.
4. The replacement must be as simple to author as Mermaid.
5. Public-facing diagrams are the right v1 scope (vs. internal diagrams).
6. The existing v1/v2 build pipeline code has reusable value for the product pipeline.
7. Sphinx is the target doc-build system (not mentioned explicitly, but implied by the plugin discussion).

---

*v0.2 — internal working document. Intentionally blunt about gaps. Not stakeholder-facing.*

## Appendix: relationship to project proposal

`docs/project-proposal.md` is the stakeholder-facing version. It covers topics this document does not:

- **Detailed capability inventory** of what exists today (16 checked items)
- **Design-language harness angle** — the system as a validation surface for the design language itself
- **Phased rollout with exit criteria** (4 phases with specific checkboxes)
- **Success metrics** (diagram count, time-to-output, compliance targets per phase)
- **Stakeholder table** with named people and roles
- **Governance model** for style system changes (icon, palette, typography, component review paths)
- **Fallback guardrails** (the other 20%) — draw.io library, Mermaid theme, Excalidraw library, Penpot library, visual guidelines, checklist, design token exports
- **Input format enumeration** — rough sketches, Excalidraw, draw.io, text definitions, Mermaid, Google Slides

This vision document intentionally focuses on **gaps and open questions** rather than repeating the proposal's content. The proposal pitches what we have; this document maps what we don't know.

