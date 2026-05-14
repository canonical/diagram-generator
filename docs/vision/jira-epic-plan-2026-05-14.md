# Diagram System — Jira Epic Plan

> Generated 2026-05-14. Ready for Jira import via API or manual creation.

---

## 1. Epic definition

**Title:** Diagram System — On-Brand Technical Diagram Production Platform

**Description:** Launch a production-ready diagram system enabling Canonical technical teams to rapidly author, validate, and publish on-brand technical diagrams with zero manual style enforcement overhead. Reduce diagram creation time from 2–4 hours to <15 minutes by Phase 3, and achieve 98% style compliance through automated validation.

**Acceptance Criteria:**
- [ ] Visual grammar layer — all canonical tokens defined and enforced in renderers
- [ ] Conceptual model — domain-specific model for describing diagram structure finalized and documented
- [ ] Compositor layer — layout engine produces pixel-perfect output matching reference SVGs
- [ ] Authoring pipeline — end-to-end workflow from sketch → edit → on-brand export established
- [ ] Enablement — documentation, training, and support model in place for 15+ concurrent users
- [ ] Metrics baseline — Phase 0–1 metrics recorded and published
- [ ] Quality bar met — all production diagrams pass linting and brand-compliance checks
- [ ] Rollout gates passed — phase entry criteria signed off before advancing

**Labels:** `diagram-system`, `product-launch`

---

## 2. Pre-epic discovery tasks (blockers)

These must complete before the epic is properly scoped.

### Discovery-001: Toolchain evaluation — D2 vs Mermaid vs custom [8 pts]

**Description:** Timeboxed (2 weeks) evaluation of D2, extended Mermaid, and custom Sphinx plugin against defined criteria.

**Acceptance Criteria:**
- Evaluation criteria defined (expressiveness, patchability, Sphinx integration, ecosystem stability, learning curve)
- Prototype diagram rendered in each candidate tool
- Side-by-side comparison document published
- Recommendation with tradeoffs documented
- Decision made and recorded

**Dependencies:** None  
**⚠️ BLOCKER — blocks all pipeline architecture decisions.**

### Discovery-002: User research — audience validation [5 pts]

**Description:** Validate audience priority assumptions with real users.

**Acceptance Criteria:**
- 3+ TA interviews completed (not just Teodora)
- 2+ PM interviews on diagram authorship vs. requesting
- 3+ doc author interviews on tool preferences
- Written summary: which audience creates diagrams, who patches, what tools, what pain points
- Audience priority confirmed or revised

**Dependencies:** None

### Discovery-003: Diagram inventory audit [5 pts]

**Description:** Catalog existing diagrams across Canonical to understand current production, types, tools, and maintenance patterns.

**Acceptance Criteria:**
- Excalidraw dump cataloged by type, complexity, and expressibility in current model
- Diagram count, tool distribution, and update frequency documented
- Top 5 most common diagram types identified
- Top 5 maintenance pain points documented

**Dependencies:** None

### Discovery-004: Conceptual model definition [13 pts]

**Description:** Define semantic mapping of diagram types onto the visual grammar. What does a flowchart / architecture / relationship diagram look like in this system?

**Acceptance Criteria:**
- Diagram type taxonomy published (flowchart, architecture, relationship, matrix, etc.)
- Each type mapped to visual grammar rules (which tokens, which composition patterns)
- 3+ reference diagrams annotated with type model
- Edge cases and limitations documented

**Dependencies:** Discovery-003 (inventory informs which types matter)  
**⚠️ HIGH — building the pipeline without this reproduces ad-hoc problems**

### Discovery-005: Complexity model definition [3 pts]

**Description:** Define complexity tiers and what the system handles at each level.

**Acceptance Criteria:**
- Complexity tiers defined (e.g., Simple / Moderate / Complex / Out-of-scope)
- Examples provided for each tier
- Hard constraints (system refuses) vs. soft constraints (system warns) documented
- Ceiling defined: what the system will never handle

**Dependencies:** Discovery-003

---

## 3. Stories by phase

### Phase 0: Validate and package (target: end of current cycle)

Goal: Confirm the prototype handles real intake and package for first adopters.

| Key | Title | Pts | Dependencies | Notes |
|-----|-------|-----|-------------|-------|
| P0-001 | Consolidate visual grammar into versioned token package | 8 | Discovery-004 | Token spec (YAML/JSON); SVG + draw.io renderers consume from package |
| P0-002 | Run 10 real diagram requests end-to-end | 8 | — | Measure time-to-output vs. author's original method |
| P0-003 | Package CLI as single-script entry point | 3 | — | `pip install` or single-script; fresh-clone smoke test |
| P0-004 | Write quickstart guide (3 most common patterns) | 3 | P0-002 | 2-page guide; validated with 1 non-author reader |
| P0-005 | Fix prototype defects (GridSpec dead code, diagonal arrowhead, spatial containment) | 5 | — | From project proposal backlog |
| P0-006 | Add automated visual regression (snapshot SVG, diff on rebuild) | 8 | P0-002 | Baseline established for 16+ production diagrams |
| P0-007 | Icon library audit and expansion | 5 | P0-002 | Brand review all 40+ icons; add 5–10 high-priority missing icons |
| P0-008 | Arrow and grid validation formalization | 5 | — | Document and enforce ≥5 arrow rules + ≥5 spacing rules |

**Phase 0 exit criteria:** 10 real diagrams produced, quickstart guide written, build runs clean on fresh clone, visual regression baseline established.

**Phase 0 total: ~45 story points**

---

### Phase 1: Pilot with tech authors (1 cycle)

Goal: First external users producing real diagrams. 10+ diagrams, 3–5 authors, <30 min each.

| Key | Title | Pts | Dependencies | Notes |
|-----|-------|-----|-------------|-------|
| P1-001 | Onboard 2–3 tech authors with walkthrough | 5 | P0-004 | Hands-on training; templates; Slack support |
| P1-002 | Provide draw.io component library for draw.io-native editing | 3 | P0-001 | Branded shapes, connectors, typography presets |
| P1-003 | Set up shared diagram request queue | 2 | — | GitHub Issues or lightweight form |
| P1-004 | Add YAML/JSON diagram definitions (no Python required) | 8 | P0-001 | Authors define diagrams without writing Python |
| P1-005 | Collect structured feedback (time, satisfaction, missing types, missing icons) | 3 | P1-001 | Survey + retrospective |
| P1-006 | Expand icon library based on pilot needs | 3 | P1-005 | Style-reviewed additions only |
| P1-007 | Spec compliance report (per-diagram score, override list) | 5 | P0-006 | Percentage of corpus at 100% compliance |
| P1-008 | Cross-format consistency check (SVG vs. draw.io structural comparison) | 5 | P0-006 | Automated from same definition |
| P1-009 | Phase 1 retrospective and go/no-go gate | 2 | P1-005 | Metrics report; decision to proceed |

**Phase 1 exit criteria:** 3+ authors self-serving diagrams, feedback collected, icon library covers pilot needs, compliance report running.

**Phase 1 total: ~36 story points**

---

### Phase 2: Expand to field engineering (1 cycle)

Goal: Field engineers producing customer-facing diagrams with consistent quality.

| Key | Title | Pts | Dependencies | Notes |
|-----|-------|-----|-------------|-------|
| P2-001 | Create 5–10 reusable templates for common field engineering patterns | 8 | P1-005 | Solution architecture, deployment, integration |
| P2-002 | Onboard field engineering team | 5 | P2-001 | Template library + training |
| P2-003 | Publish draw.io component library to Confluence/wiki | 3 | P1-002 | Accessible to field team |
| P2-004 | Publish Penpot component library | 5 | P0-001 | Branded building blocks for Penpot users |
| P2-005 | Write visual guidelines doc for unconstrained path | 5 | P1-007 | Palette, typography, spacing, do/don't examples |
| P2-006 | Build brand review checklist | 2 | P2-005 | Self-check before publishing |
| P2-007 | Phase 2 retrospective and go/no-go gate | 2 | P2-002 | Metrics + decision |

**Phase 2 exit criteria:** Field engineering using system for customer materials, guidelines doc published.

**Phase 2 total: ~30 story points**

---

### Phase 3: Self-serve and scale (1–2 cycles)

Goal: Any Canonical contributor produces on-brand diagrams without specialised help. 50+ diagrams, 15+ users, <15 min.

| Key | Title | Pts | Dependencies | Notes |
|-----|-------|-----|-------------|-------|
| P3-001 | Interactive web editor (matured preview server) as internal tool | 13 | P1-004 | ⚠️ Likely underestimate |
| P3-002 | Web form/wizard for non-technical YAML/JSON definition | 8 | P1-004 | PMs can create without code |
| P3-003 | Docs build pipeline integration (auto-generate from definitions in docs repos) | 8 | Toolchain decision | Sphinx plugin or equivalent |
| P3-004 | Token change → rebuild → diff pipeline | 5 | P0-006 | Change a spec value, see what moved |
| P3-005 | Upstream spec watch (flag affected diagrams when specs change) | 5 | P3-004 | Pre-rebuild impact assessment |
| P3-006 | Mermaid-to-diagram parser | 5 | P1-004 | Import path for Mermaid authors |
| P3-007 | Sketch-to-diagram AI intake | 13 | P3-002 | Upload rough sketch → draft definition. ⚠️ Scope risk |
| P3-008 | Accessibility layer (alt text, semantic SVG, WCAG contrast) | 5 | P0-001 | — |
| P3-009 | CI/CD validation hooks (fail builds on constraint violations) | 5 | P1-007 | — |

**Phase 3 exit criteria:** Self-serve tool available, docs pipeline integration working, 50+ diagrams in system.

**Phase 3 total: ~67 story points**

---

## 4. Labels and components

### Labels

| Label | Usage |
|-------|-------|
| `diagram-system` | All issues in this epic |
| `phase-0` / `phase-1` / `phase-2` / `phase-3` | Phase assignment |
| `discovery` | Pre-epic tasks |
| `visual-grammar` | Tokens, brand, palette |
| `conceptual-model` | DSL, type taxonomy |
| `compositor` | Layout, nesting, arrows |
| `authoring-pipeline` | Editor, export, CI/CD |
| `enablement` | Training, docs, templates |
| `blocker` | Blocks other work |
| `underestimate-risk` | Story points likely too low |

### Components

| Component | Description |
|-----------|-------------|
| Visual Grammar & Tokens | Color, spacing, typography token system |
| Diagram Model | Python dataclass schema, YAML/JSON definitions |
| SVG Renderer | Editable SVG output, Illustrator-safe |
| draw.io Renderer | Native XML output |
| Interactive Editor | Preview server, brand-constrained editing |
| Linter & Compliance | Build-time validation, spec compliance |
| Enablement & Docs | Guides, templates, training |

---

## 5. Risk register

| ID | Risk | Impact | Likelihood | Mitigation |
|----|------|--------|------------|-----------|
| R1 | Conceptual layer skipped — pipeline reproduces ad-hoc problems | High | Medium | Discovery-004 gates; don't build pipeline before type taxonomy |
| R2 | TA adoption hinges on one contact (Teodora) who may be atypical | Medium | Medium | Discovery-002: interview 3+ TAs; validate assumptions early |
| R3 | Toolchain decision deferred → blocks architecture | High | High | Discovery-001: timeboxed 2-week eval |
| R4 | AI intake feature dominates scope if included in v1 | High | Medium | Explicitly defer to Phase 3; tight scope if included |
| R5 | "Measured interactivity" stays vague → scope creep | Medium | Medium | Define concrete features for v1; if "none," say so |
| R6 | Single maintainer (bus factor = 1) | High | Medium | Phase 1 creates co-owners; document everything |
| R7 | Users won't switch from Excalidraw | Low | Medium | Don't force migration; prove time savings in pilot |
| R8 | Draw.io format instability | Medium | Low | Pin XML schema version; test against releases |

---

## 6. Jira API integration plan

### Required endpoints

| Endpoint | Purpose |
|----------|---------|
| `POST /rest/api/3/issue` | Create epic, stories, tasks |
| `POST /rest/api/3/issueLink` | Link dependencies between stories |
| `GET /rest/api/3/project/{key}` | Verify project exists and get metadata |
| `GET /rest/api/3/issuetype` | Get available issue types for the project |
| `GET /rest/api/3/field` | Find custom field IDs (story points, epic link) |

### Authentication

Jira Cloud uses API tokens with Basic Auth:
```
Authorization: Basic base64(email:api_token)
```

Generate at: `https://id.atlassian.com/manage-profile/security/api-tokens`

For Jira Server/Data Center: use Personal Access Tokens with Bearer auth.

### Custom field discovery

Story points and epic link field IDs vary per instance. Run this to find them:

```bash
curl -s -u email:token https://jira.canonical.com/rest/api/3/field \
  | python -m json.tool | grep -i "story\|epic\|point"
```

Common field IDs:
- Story points: `customfield_10016` (Jira Cloud) or `customfield_10002` (Server)
- Epic link: `customfield_10014` (Cloud) or `customfield_10008` (Server)

### Script

See `scripts/create_jira_epic.py` for the full implementation. Usage:

```bash
# Dry run — prints structure without creating issues
python scripts/create_jira_epic.py \
  --jira-url "https://jira.canonical.com" \
  --email "your@email.com" \
  --token "YOUR_API_TOKEN" \
  --project "DES" \
  --dry-run

# Execute — creates epic + all stories
python scripts/create_jira_epic.py \
  --jira-url "https://jira.canonical.com" \
  --email "your@email.com" \
  --token "YOUR_API_TOKEN" \
  --project "DES"
```

---

## 7. Summary

| Phase | Stories | Points | Target |
|-------|---------|--------|--------|
| Discovery | 5 | 34 | Pre-epic |
| Phase 0 | 8 | 45 | End of current cycle |
| Phase 1 | 9 | 36 | 1 cycle |
| Phase 2 | 7 | 30 | 1 cycle |
| Phase 3 | 9 | 67 | 1–2 cycles |
| **Total** | **38** | **212** | — |

**Total estimated effort: ~212 story points across 4 phases + discovery.**

---

*Internal planning document. Story point estimates are initial sizing — expect refinement during sprint planning.*
