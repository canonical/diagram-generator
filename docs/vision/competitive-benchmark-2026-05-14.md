# Diagram System — Competitive Benchmark

> Generated 2026-05-14. Analysis of market positioning and feature landscape.

---

## Tool audit

### Mermaid (open-source, MIT)
Widest ecosystem; default for GitHub/GitLab README diagrams. 20+ diagram types, text-based DSL with Markdown-like learning curve. Strong docs integration. **Weaknesses:** Visual output is generic and inflexible; no brand constraint enforcement; theming limited to color swaps, not proportions or typography; output is not editable after rendering; no grid validation. **Relevance:** Incumbent at Canonical. Its permissive, generic output is precisely what the system aims to constrain.

### D2 (Terrastruct; CLI open-source)
Closest conceptually to this system. Declarative DSL with strong object model (containers, nesting, classes). Multiple layout engines (ELK, Graphviz, Tala). Designer-created themes; animation support; sketch mode. **Weaknesses:** Themes are fixed presets, not parametric; no grid validation; SVG-only output (no draw.io XML); no interactive preview editor; small ecosystem. **Relevance:** If D2 adds grid validation and multi-format output, it could serve as a platform for v2.

### Excalidraw (open-source, MIT)
Hand-drawn aesthetic; real-time collaboration; browser-based. **Weaknesses:** Style is antithetical to on-brand production diagrams; not declarative; not patchable by non-designers; no design token integration. **Relevance:** Used by some engineers but the opposite of the system's requirements.

### draw.io / diagrams.net (open-source desktop, Apache 2.0)
General-purpose GUI diagramming; XML-native format; massive shape library; draw.io desktop/web/VS Code plugin; integrations with GitHub, Confluence, Jira. **Weaknesses:** GUI-first, no text DSL; no brand enforcement; no grid validation; no component library auto-generation; no dual-output workflow. **Relevance:** Correct downstream patchability target. System generates draw.io XML for TAs to edit manually.

### PlantUML (open-source, GPL)
UML-focused; wide diagram types; Graphviz backend. **Weaknesses:** Output styling is primitive; UML-centric limits applicability; no grid layout or alignment validation. **Relevance:** Orthogonal. Canonical diagrams are not UML-focused.

### Structurizr (C4 Model; proprietary cloud + open-source DSL)
Purpose-built for C4 model; models-as-code; AI-friendly DSL; MCP server. **Weaknesses:** Strictly C4; no general-purpose diagram support; no grid validation; no draw.io output. **Relevance:** Reference for codified type models and MCP integration pattern.

### Kroki (open-source, MIT)
Unified HTTP API for 20+ diagram types. Meta-tool aggregating other tools' capabilities. **Relevance:** Reference architecture for tool aggregation, but would dilute constraint enforcement.

### Figma / Penpot
Design tools with token/component systems. Not diagram-specific; no DSL, no build-time validation. **Relevance:** Should be token *sources*, not authoring platforms.

### Lucidchart / Whimsical
Enterprise/startup diagramming SaaS. AI features, collaboration. **Relevance:** Reference for AI integration and data-driven diagramming, but proprietary and not suitable for docs-as-code workflows.

---

## Additional tools to consider

- **Tldraw** (open-source) — whiteboarding canvas; hand-drawn; not production-ready
- **yEd** (freemium) — general diagram editor; not DSL-based
- **Inkscape** (open-source) — vector graphics; GUI-only
- **Vega/Vega-Lite** — data-viz grammar; not for process/architecture diagrams
- **TikZ** — LaTeX diagrams; not for web docs

**Notably missing from the market:**
- Constrained visual grammar systems
- Build-time diagram validation
- Patchable multi-format output (editable SVG + structured XML)
- Sphinx/docs-as-code-first diagram systems with brand enforcement

---

## Feature matrix

| Feature | Mermaid | D2 | PlantUML | Structurizr | Excalidraw | draw.io | **This system** |
|---------|---------|-----|----------|-------------|------------|---------|----------------|
| Text-based DSL | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ |
| Visual/GUI authoring | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ (preview editor) |
| Brand constraint enforcement | ❌ | Partial | ❌ | ❌ | ❌ | ❌ | **✅** |
| Design token integration | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | **✅** |
| Dual patchable output | ❌ | ❌ | Partial | ❌ | Partial | ✅ (XML) | **✅** (SVG + draw.io) |
| Sphinx integration | ✅ | ✅ | ✅ | ❌ | ❌ | Partial | Planned |
| Build-time validation | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | **✅** |
| Component library | ❌ | Variables | Includes | ✅ | ❌ | ✅ | **✅** (auto-generated) |
| Self-hosted / OSS | ✅ | Partial | ✅ | ❌ | ✅ | ✅ | ✅ |
| AI-assisted | ❌ | ❌ | ❌ | ✅ (MCP) | ❌ | ✅ | Planned |

---

## Unique positioning

What this system offers that **no existing tool** does:

1. **Constrained visual grammar enforced at model level** — brand constraints are in the type system, not post-hoc styling. Invalid diagrams fail to generate.
2. **Dual-format patchable output** — editable SVG + native draw.io XML from a single definition.
3. **Build-time geometric validation** — baseline grid, arrow crossings, clearance validated at generation time.
4. **Design language integration** — consumes live spec tokens, not hardcoded presets.
5. **Interactive preview with constraint enforcement** — WYSIWYG within brand rails.
6. **Corpus-level auditing** — element-count, 3-way comparison, spec compliance scoring.

---

## Build-vs-buy assessment

| Missing layer | Recommendation | Rationale |
|---------------|---------------|-----------|
| Conceptual layer (diagram types) | **Build** | Unique to Canonical's brand; no existing tool has this |
| Compositor (nesting rules) | **Build** | No existing tool provides enforceable composition rules |
| Sphinx plugin | **Build** | Standard plugin scaffold; 1–2 days base work |
| TA playbook / enablement | **Build** | Canonical-specific domain knowledge required |
| Accessibility layer | **Build** | Standard WCAG practices applied to SVG output |
| CI/CD validation hooks | **Build** | Leverage existing Python validators |
| AI integration (MCP) | **Build/adapt** | Reference Structurizr MCP pattern |

**Key insight:** Most missing layers require Canonical-specific logic. Build is the right call for the core.

---

## Strategic watch items

- **D2:** If it adds grid validation + multi-format output, consider as v2 platform
- **Mermaid 11:** Architecture diagrams being added; expressiveness gap may narrow
- **DTCG (Design Token Community Group):** Token format standardization could simplify spec integration

---

*Internal competitive analysis. Not for distribution.*
