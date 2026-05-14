# Diagram System — Gap Analysis Report

> Merged findings from four analytical perspectives: Business Owner, UX Architect, User Researcher, and Competitive Benchmarking.  
> Source: vision v0.2 + project proposal, 2026-05-14.

---

## How to read this

Findings are deduped across the four analyses and grouped by theme. Each finding is tagged with severity and the perspectives that flagged it. Where three or more perspectives raised the same issue, it's marked **consensus**.

Severity:
- **BLOCKER** — must resolve before epic creation or budget commitment
- **HIGH** — must resolve before building
- **MEDIUM** — should resolve during Phase 0–1
- **LOW** — can defer to Phase 2+

---

## 1. Scope & strategy gaps

### 1.1 Toolchain decision is deferred but blocks everything

**Severity: BLOCKER** | Business, UX, Benchmarking | **Consensus**

D2 vs. Mermaid-extension vs. custom Sphinx plugin is not decided. Pipeline architecture, Sphinx integration, authoring UX, output format — all downstream work depends on this.

**Benchmarking context:** D2 is closest conceptually (declarative model, themes) but lacks grid validation and draw.io output. Mermaid has ecosystem but limited expressiveness. No existing tool offers the full constraint stack. Evaluation criteria are also undefined.

**Action needed:** Timeboxed evaluation (2 weeks max) with defined criteria: expressiveness, patchability, Sphinx integration, ecosystem stability, learning curve.

### 1.2 AI features scope boundary is undefined

**Severity: BLOCKER** | Business, UX, User Research | **Consensus**

"Point at a page, AI suggests diagrams" was mentioned without scoping. If v1, project roughly doubles. If deferred, it's a clean phase-2 feature. No decision was made.

**Action needed:** Explicitly defer to phase 2, OR define a minimal viable AI feature (e.g., "highlight passages only, no generation").

### 1.3 No success metrics or adoption targets

**Severity: HIGH** | Business, UX

The vision has no measurable definition of success. How many diagrams/year? How many active users? What time savings? Without this, you can't know if the project worked.

**Note:** The project proposal *does* define metrics (10 diagrams Phase 1, 50+ Phase 3, <30min time-to-output). These should be pulled into the vision as commitments, not just proposal aspirations.

### 1.4 Build-vs-buy not addressed

**Severity: HIGH** | Business, Benchmarking

No analysis of whether buying/adopting an existing tool is cheaper than building. The benchmarking analysis shows no single tool covers the full requirement set, but the gap analysis should be explicit about this.

**Benchmarking conclusion:** Most missing layers require Canonical-specific logic. No existing tool provides constrained grammar + build-time validation + dual patchable output + design token integration. Build is the right call for the core, but some layers (Sphinx plugin, accessibility, CI/CD hooks) can adopt standard patterns.

### 1.5 "Measured interactivity" is undefined

**Severity: MEDIUM** | Business, UX | **Consensus**

The word "measured" appeared with no concrete features. Candidates range from "no runtime JS" to "tooltips + expand/collapse." This intersects the toolchain decision — interactive output may require web components.

**Action needed:** Define the interactivity floor and ceiling for v1. If "none" (static SVG), say so explicitly.

---

## 2. User & audience gaps

### 2.1 No user research backing audience priorities

**Severity: BLOCKER** | Business, User Research | **Consensus**

"PMs are natural first adopters" — no evidence. "TAs are gatekeepers" — based on one contact (Teodora, acknowledged as an outlier). "Engineers are hardest to move" — no data on why.

**Research needed:**
- Survey of current diagram production across audiences
- Interviews with 3–5 TAs (not just Teodora) on editing workflows and constraints
- PM interviews to validate whether PMs actually author diagrams or just request them
- Doc author interviews on tool preferences and switching costs

### 2.2 Audience priority vs. adoption leverage contradiction

**Severity: HIGH** | Business, UX, User Research | **Consensus**

PMs are priority #1 but TAs are the adoption lever. If TAs don't adopt, PM adoption alone doesn't create an org standard. The sequencing assumes PM proof convinces TAs — **is that actually true?**

**Open question:** Should TAs be co-designers of constraints from day 1 rather than late-stage adopters?

### 2.3 "Patchable output" is undefined operationally

**Severity: HIGH** | UX, User Research | **Consensus**

"Patchable" is a hard requirement but means different things: edit-source-and-regenerate vs. edit-draw.io-and-commit vs. file-an-issue-and-wait. Each has different implications for TA workflow, version control, and constraint enforcement.

**Also:** If TAs edit draw.io output directly, who enforces brand constraints? There's no feedback loop preventing visual drift after manual edits.

### 2.4 No existing diagram inventory or audit

**Severity: HIGH** | Business, User Research, Benchmarking

How many diagrams does Canonical produce per year? In what tools? What types? How often updated? Without this, the scope is based on assumptions.

**Note:** The project proposal mentions an "Excalidraw dump audit" as a Phase 0 task — this should be elevated to a pre-epic prerequisite.

### 2.5 Why Mermaid failed is not diagnosed

**Severity: MEDIUM** | User Research, Benchmarking

Mermaid is "too limited" but nobody investigated whether the failure was capability, UX friction, poor adoption, or something else. If it was workflow friction, a new system repeats the same mistake.

### 2.6 Missing user journeys

**Severity: MEDIUM** | UX

No workflows mapped for:
- "I need to fix a diagram quickly" (TA emergency patch)
- "I'm a new PM and want to add a diagram" (first-run experience)
- "This diagram is now wrong because the product changed" (maintenance trigger)
- "Should this be prose or a diagram?" (authoring decision)
- "We have 50 Excalidraw diagrams — now what?" (migration path)

### 2.7 Persona gaps

**Severity: MEDIUM** | User Research

- TAs treated as monolith; spectrum from scriptable to GUI-only not understood
- Doc author heterogeneity not mapped (one-off sketcher vs. docs-as-code author)
- PM authorship unclear — do they create diagrams or request them?
- External contributors not mentioned — are they in scope?

---

## 3. Architecture & technical gaps

### 3.1 Conceptual layer is missing (diagram type taxonomy)

**Severity: HIGH** | All four perspectives | **Consensus**

No semantic mapping of diagram types onto the visual grammar. "What does a flowchart look like in this system?" is undefined. Building the pipeline without this will reproduce current ad-hoc problems.

**Benchmarking note:** This is Canonical's primary moat vs. Mermaid. Structurizr proves that codified type models (C4) work. Canonical needs an equivalent but domain-agnostic.

### 3.2 Compositor rules are missing

**Severity: HIGH** | Vision, UX, Benchmarking

No rules for nesting, grouping, overlap, strong/weak relationships, allowed/disallowed connections. Current failures: overlapping shapes, ambiguous containment.

### 3.3 No authoring experience defined

**Severity: HIGH** | UX | **Consensus**

The system has five layers but no user-facing authoring story. Do users write YAML? Use a visual builder? Prompt an AI? Each choice has radically different learning curves.

**Note:** The project proposal sketches this (Python today → YAML/JSON Phase 1 → web editor Phase 3), but the vision document doesn't commit to an authoring metaphor.

### 3.4 Complexity model is undefined

**Severity: MEDIUM** | Vision, Business, UX

"Complexity bucketing" mentioned but no tiers, no ceiling, no hard/soft constraint definitions, no examples of "too complex."

### 3.5 Accessibility not addressed

**Severity: MEDIUM** | UX, Benchmarking

No mention of: alt text, ARIA labels, WCAG contrast, dark mode, semantic SVG markup, screen reader support, keyboard navigation for interactive diagrams, or minimum readable size.

### 3.6 Change propagation undefined

**Severity: MEDIUM** | UX

When diagram source updates, how does it reach publication? Auto-deploy? Manual approval? Diff preview? When brand tokens change, which diagrams are affected?

**Note:** The project proposal includes "token change → rebuild → diff pipeline" and "upstream spec watch" in Phase 3. These should be referenced in the vision.

---

## 4. Organizational & process gaps

### 4.1 No team, budget, or timeline

**Severity: HIGH** | Business

Six phases with no sizing, no team allocation, no budget. This is a blank check.

**Note:** The project proposal has more detail (phased rollout with exit criteria, stakeholder table). The vision should either reference the proposal or absorb its operational detail.

### 4.2 Single maintainer risk (bus factor = 1)

**Severity: HIGH** | Business (via project proposal)

The project proposal acknowledges this. Phase 1 is supposed to create co-owners, but the risk is real until that happens.

### 4.3 No governance model for diagram ownership

**Severity: MEDIUM** | UX, User Research

Who maintains a diagram when the product changes? If the original author leaves, does the diagram rot? No ownership model.

### 4.4 No maintenance/support plan

**Severity: MEDIUM** | Business

Who owns this 3 years from now? What's the cost to keep it working as tooling evolves?

### 4.5 Enablement comes too late

**Severity: MEDIUM** | Business, UX

Enablement is Phase 5 in the vision (Phase 1–2 in the proposal). If TAs are gatekeepers, guidelines and training should start in Phase 0–1, not after the pipeline is built.

---

## 5. Competitive positioning

### 5.1 Unique position (what no existing tool offers)

This system's combination is genuinely unique:

1. **Constrained visual grammar enforced at model level** — brand constraints in the type system, not post-hoc styling
2. **Dual-format patchable output** — editable SVG + native draw.io XML from a single definition
3. **Build-time geometric validation** — baseline grid, arrow crossings, clearance validated at generation time
4. **Design language integration** — consumes live spec tokens, not hardcoded presets
5. **Interactive preview with constraint enforcement** — WYSIWYG within brand rails
6. **Corpus-level auditing** — element-count auditing, 3-way comparison, spec compliance scoring potential

**No competitor offers this combination.** D2 is closest conceptually but lacks grid validation and draw.io output.

### 5.2 Feature gaps vs. comprehensive coverage

To be comprehensive for the stated audience, the system still needs:

| Gap | Severity | Build or buy? |
|-----|----------|--------------|
| Conceptual layer (diagram type taxonomy) | HIGH | Build — unique to Canonical |
| Compositor (nesting/grouping rules) | HIGH | Build — no existing tool has this |
| Sphinx plugin | HIGH | Build — standard plugin scaffold |
| TA playbook and enablement | HIGH | Build — Canonical-specific |
| Accessibility layer | MEDIUM | Build — standard WCAG practices |
| CI/CD validation hooks | MEDIUM | Build — leverage existing validators |
| Multi-diagram linking | LOW | Build — custom referential integrity |
| AI integration (MCP server) | LOW (v2) | Build/adapt — reference Structurizr MCP pattern |
| Diagram versioning/history | LOW | Leverage Git + custom diff viz |

### 5.3 Strategic watch items

- **D2 evolution:** If D2 adds grid validation and multi-format output, consider it as a platform for v2
- **Mermaid 11:** Architecture diagrams being added; may reduce the expressiveness gap
- **DTCG (Design Token Community Group):** Token format standardization could simplify spec integration

---

## 6. Vision ↔ Project proposal deduplication

The project proposal (`docs/project-proposal.md`) and the vision (`vision.md`) overlap significantly. Key differences:

### In the proposal but missing from the vision

| Topic | Proposal has | Vision lacks |
|-------|-------------|-------------|
| **What exists today** | Detailed capability inventory (16 checked items) | Brief "partial" status |
| **Design-language harness angle** | Full section on validation harness potential | Not mentioned |
| **Phased rollout with exit criteria** | 4 phases with checkboxes | Rough 7-phase sequence, no exit criteria |
| **Success metrics** | Table with targets per phase | No metrics |
| **Stakeholder table** | Named people + roles | Not mentioned |
| **Governance model** | Icon/palette/typography/component review paths | Not mentioned |
| **Fallback guardrails (the other 20%)** | draw.io library, Mermaid theme, Excalidraw library, Penpot library, guidelines doc, checklist, design token exports | Only mentions the constrained path |
| **Input formats** | Rough sketches, Excalidraw, draw.io, text, Mermaid, Google Slides | Not enumerated |
| **Risks with mitigations** | 6 risks with specific mitigations | 7 risks, less specific mitigations |

### In the vision but missing from the proposal

| Topic | Vision has | Proposal lacks |
|-------|-----------|---------------|
| **Open questions (blocking)** | Grouped by urgency with impact | Fewer, grouped by topic |
| **Assumptions explicitly listed** | 7 explicit assumptions | Implicit |
| **Audience priority rationale** | Explains why PMs first | Lists audiences without priority logic |
| **Compositor / relationship model** | Explicit gap | Not mentioned |
| **Complexity model** | Explicit gap | Not mentioned |

### Recommendation

The two documents serve different purposes:
- **Vision** = internal blunt gap map (this is what we don't know)
- **Proposal** = stakeholder pitch (this is what we have and where we're going)

They should cross-reference each other but not merge. The vision should absorb the proposal's operational detail (metrics, phases, exit criteria) as committed plans rather than aspirations. The proposal should reference the vision's gap list as known risks.

---

*Generated 2026-05-14. Four perspectives: Business Owner, UX Architect, User Researcher, Competitive Benchmarking.*
