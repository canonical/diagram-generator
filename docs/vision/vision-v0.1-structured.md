

# Diagram System — Product Vision

> Source: meeting notes 2026-05-14. Raw notes archived in `docs/vision/vision-raw-meeting-notes-2026-05-14.md`.

---

## 1. Problem statement

Canonical's documentation and public-facing materials contain diagrams that are inconsistent, hard to maintain, and produced through ad-hoc tooling. There is no shared standard, no visual grammar enforcement, and no pipeline that connects authoring intent to on-brand output. Engineers use Excalidraw, PMs use draw.io, TAs paste screenshots — the result is visual noise and maintenance burden.

## 2. Product scope

### 2.1 What this product is

A diagram system that provides:

1. **A visual grammar** — a defined set of tokens, shapes, relationships, and composition rules that constrain output variation.
2. **A conceptual layer** — semantic mapping of domain concepts (flowcharts, architecture, relationship diagrams) onto the visual grammar.
3. **A composition engine** — rules for composing elements: nesting, grouping, overlapping, representing strong vs. weak relationships, allowed/disallowed connections.
4. **An authoring pipeline** — input → process → output, with controlled variation in output.
5. **Enablement materials** — guidelines, examples, and domain-specific templates that help authors make diagrams simpler and more communicative.

### 2.2 What this product is not

- Not a full interactive data-visualization platform (no overkill D3).
- Not a replacement for all diagramming tools — it targets public-facing documentation output.

### 2.3 Target output

**Public/production-ready facing diagrams.** Internal-use-only diagrams are out of scope for v1.

## 3. Target audiences (priority order)

| Priority | Audience | Notes |
|----------|----------|-------|
| 1 | **PMs** | Natural first target group. Produce diagrams for product pages and proposals. |
| 2 | **Documentation authors** (often engineers) | Most important audience by volume. Written by engineers, consumed by users. |
| 3 | **TAs (Technical Authors)** | Gatekeepers of documentation standards. If TAs adopt it, it becomes the standard. Key contact: Teodora. |
| 4 | **Engineers** (Excalidraw users) | Lowest priority. Hardest to move off existing tools. |

### Audience-specific constraints

- **TAs** define documentation priorities. Convincing TAs is the leverage point for org-wide adoption.
- **TAs** have a political constraint: avoid screenshots, avoid things that change often. Diagrams must be patchable/editable, not baked images.
- **Documentation authors** need a tool that produces editable, versionable output — not opaque binary blobs.

## 4. What exists today vs. what's missing

| Layer | Status | Detail |
|-------|--------|--------|
| Visual grammar | **Exists** | Token system, shape rules, color constraints — defined in `DIAGRAM.md`. |
| Conceptual layer | **MISSING** | No semantic mapping of domain concepts onto the visual grammar. E.g. "what does a flowchart look like in this system?" is undefined. |
| Composition rules (compositor) | **MISSING** | No rules for nesting, overlap, grouping. Current failures: overlapping shapes, ambiguous containment, no strong/weak relationship encoding. |
| Relationship types | **MISSING** | Multiple belonging, overlap, allowed/disallowed connections. (Venn diagram reference from @Hartmut.) |
| Enablement | **MISSING** | No guidelines for "this diagram is too complex — here's how to simplify." No examples of communicative qualities. No domain-specific examples. |
| Pipeline (input → output) | **Partially exists** | v1 and v2 build pipelines exist but are developer-operated. No self-service authoring. |

## 5. Complexity model

**[UNCLEAR]** Meeting mentioned "complexity bucketing" but didn't define the buckets. This needs to be fleshed out:

- What are the complexity tiers? (Simple / Medium / Complex?)
- What's the maximum complexity the system should handle vs. push back on?
- Which limitations should be hard constraints (system refuses) vs. soft constraints (system warns)?

## 6. Authoring standard & toolchain

### 6.1 Current standard

Mermaid is the current documentation standard but is "way too limited."

### 6.2 Alternatives discussed

| Option | Pros | Cons | Status |
|--------|------|------|--------|
| **Mermaid** | Current standard, widely known, Sphinx plugin exists | Too limited for complex diagrams | Current default |
| **D2** | More expressive than Mermaid | Less known, ecosystem maturity unclear | **[NEEDS EVALUATION]** |
| **Sphinx plugin (custom?)** | Integrates into existing doc build | Maintenance burden, unclear scope | **[NEEDS EVALUATION]** |

### 6.3 Hard requirement

**TAs must be able to go and make changes.** The output must be patchable — editable text or structured data, not baked images. This rules out any pipeline that produces only raster output.

## 7. AI-assisted features

### 7.1 Diagram suggestion from content

"Point it to a page, then AI suggests which passages to do as diagrams."

**[UNCLEAR]** — This is a compelling feature but has significant scope implications:

- Is this v1 or a future phase?
- What level of suggestion? (Highlight passages? Generate draft diagrams? Both?)
- What's the fallback when AI suggestions are wrong?

### 7.2 Complexity mitigation

"This diagram is too complex" → system provides mitigation guidelines. Doesn't have to be AI — can be examples and decision trees.

## 8. Interactivity

**Measured approach.** Some interactivity is desired (this is why people use Mermaid — it's programmatic). But not full D3-level interactivity. 

**[UNCLEAR]** — What does "measured interactivity" mean concretely? Examples:

- Hover tooltips?
- Expand/collapse groups?
- Click-through to documentation sections?
- Pan/zoom on large diagrams?

## 9. Proposed execution sequence

From meeting notes, roughly:

1. **Agree on scope** — what's in and what's out for v1.
2. **Pick starting audience** — PMs as the first target group.
3. **Define complexity buckets** — what the system handles at each tier.
4. **Build the pipeline** — input → process → output with variation control.
5. **Define the conceptual layer** — semantic concept mapping.
6. **Define composition rules** — the compositor.
7. **Build enablement** — guidelines, examples, domain templates.

## 10. Open questions

These need answers before this can become a Jira epic with confident estimates:

| # | Question | Impact |
|---|----------|--------|
| 1 | Which limitations should be hard vs. soft? | Defines system behavior and error UX. |
| 2 | What are the complexity buckets? | Scopes what v1 handles. |
| 3 | What's the evaluation outcome for D2 vs. custom Sphinx plugin vs. extending Mermaid? | Determines the entire technical stack. |
| 4 | Is AI diagram suggestion in v1 scope? | Major scope/cost difference. |
| 5 | What does "measured interactivity" mean concretely? | Determines frontend complexity. |
| 6 | What types of diagrams do engineers actually make? | Informs the conceptual layer. |
| 7 | What is the relationship model? (Hartmut's Venn diagram reference) | Core compositor input. |
| 8 | Who owns the Sphinx plugin / doc-build integration? | Determines team dependencies. |
| 9 | What's the TA adoption path? (Teodora is identified as key but described as "a bit of an outlier") | Risk: if Teodora is atypical, TA adoption may be harder than assumed. |

## 11. Risks and assumptions

### Assumptions (stated or implied)

- The visual grammar from `DIAGRAM.md` is solid enough to build on.
- PMs are the right starting audience.
- TAs will adopt if the tool meets their patchability requirement.
- Mermaid is insufficient but the replacement must be similarly simple to author.

### Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Conceptual layer is underspecified — building without it will reproduce current ad-hoc problems | High | Define semantic concept mapping before building the pipeline. |
| TA adoption depends on one outlier contact (Teodora) | Medium | Validate with broader TA group early. |
| "Measured interactivity" is vague — scope creep risk | Medium | Define concrete interactivity features for v1 vs. later. |
| D2/Mermaid/custom decision not made — blocks technical architecture | High | Run a timeboxed evaluation sprint. |
| AI suggestion feature could dominate scope if included in v1 | High | Explicitly defer or scope tightly. |

---

*This document is a working internal artifact. It is intentionally blunt about gaps.*

