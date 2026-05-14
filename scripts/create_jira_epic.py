#!/usr/bin/env python3
"""
Create Diagram System Epic and all stories via Jira REST API.

Usage:
  python scripts/create_jira_epic.py \
    --jira-url "https://jira.canonical.com" \
    --email "your@email.com" \
    --token "<YOUR_JIRA_API_TOKEN>" \
    --project "DES" \
    --dry-run

Generate API token at: https://id.atlassian.com/manage-profile/security/api-tokens
"""

import argparse
import base64
import json
import sys
from typing import Any, Optional

import requests

# ===== CUSTOM FIELD IDs =====
# These vary per Jira instance. Run field discovery first:
#   curl -s -u email:token https://jira.example.com/rest/api/3/field \
#     | python -m json.tool | grep -i "story\|epic\|point"
STORY_POINTS_FIELD = "customfield_10016"  # Jira Cloud default
EPIC_LINK_FIELD = "customfield_10014"  # Jira Cloud default


# ===== DATA =====

EPIC = {
    "summary": "Diagram System \u2013 On-Brand Technical Diagram Production Platform",
    "description": (
        "Launch a production-ready diagram system enabling Canonical technical "
        "teams to rapidly author, validate, and publish on-brand technical "
        "diagrams. Reduce creation time to <15 min and achieve 98% compliance."
    ),
}

DISCOVERY_TASKS = [
    {
        "summary": "[Discovery] Toolchain evaluation \u2013 D2 vs Mermaid vs custom",
        "points": 8,
        "labels": ["discovery", "blocker"],
        "description": (
            "Timeboxed 2-week evaluation of D2, extended Mermaid, and custom "
            "Sphinx plugin against defined criteria (expressiveness, patchability, "
            "Sphinx integration, ecosystem stability, learning curve)."
        ),
    },
    {
        "summary": "[Discovery] User research \u2013 audience validation",
        "points": 5,
        "labels": ["discovery"],
        "description": (
            "Validate audience priority assumptions: 3+ TA interviews, 2+ PM "
            "interviews, 3+ doc author interviews. Written summary of who creates "
            "diagrams, who patches, what tools, what pain points."
        ),
    },
    {
        "summary": "[Discovery] Diagram inventory audit",
        "points": 5,
        "labels": ["discovery"],
        "description": (
            "Catalog existing diagrams across Canonical. Excalidraw dump by type, "
            "complexity, expressibility. Count, tool distribution, update frequency. "
            "Top 5 diagram types and maintenance pain points."
        ),
    },
    {
        "summary": "[Discovery] Conceptual model definition \u2013 diagram type taxonomy",
        "points": 13,
        "labels": ["discovery", "conceptual-model"],
        "description": (
            "Define semantic mapping of diagram types onto visual grammar. "
            "Taxonomy, per-type visual grammar rules, 3+ annotated reference "
            "diagrams, edge cases documented."
        ),
    },
    {
        "summary": "[Discovery] Complexity model definition",
        "points": 3,
        "labels": ["discovery"],
        "description": (
            "Define complexity tiers (Simple/Moderate/Complex/Out-of-scope), "
            "examples for each, hard vs soft constraints, ceiling."
        ),
    },
]

PHASE_0 = [
    {"summary": "[P0] Consolidate visual grammar into versioned token package", "points": 8, "labels": ["phase-0", "visual-grammar"]},
    {"summary": "[P0] Run 10 real diagram requests end-to-end", "points": 8, "labels": ["phase-0"]},
    {"summary": "[P0] Package CLI as single-script entry point", "points": 3, "labels": ["phase-0"]},
    {"summary": "[P0] Write quickstart guide (3 most common patterns)", "points": 3, "labels": ["phase-0", "enablement"]},
    {"summary": "[P0] Fix prototype defects (GridSpec, diagonal arrowhead, spatial containment)", "points": 5, "labels": ["phase-0"]},
    {"summary": "[P0] Add automated visual regression (snapshot SVG, diff on rebuild)", "points": 8, "labels": ["phase-0"]},
    {"summary": "[P0] Icon library audit and expansion", "points": 5, "labels": ["phase-0", "visual-grammar"]},
    {"summary": "[P0] Arrow and grid validation formalization", "points": 5, "labels": ["phase-0", "compositor"]},
]

PHASE_1 = [
    {"summary": "[P1] Onboard 2\u20133 tech authors with walkthrough", "points": 5, "labels": ["phase-1", "enablement"]},
    {"summary": "[P1] Provide draw.io component library for native editing", "points": 3, "labels": ["phase-1"]},
    {"summary": "[P1] Set up shared diagram request queue", "points": 2, "labels": ["phase-1"]},
    {"summary": "[P1] Add YAML/JSON diagram definitions (no Python required)", "points": 8, "labels": ["phase-1", "authoring-pipeline"]},
    {"summary": "[P1] Collect structured feedback (time, satisfaction, gaps)", "points": 3, "labels": ["phase-1"]},
    {"summary": "[P1] Expand icon library based on pilot needs", "points": 3, "labels": ["phase-1", "visual-grammar"]},
    {"summary": "[P1] Spec compliance report (per-diagram score)", "points": 5, "labels": ["phase-1", "compliance"]},
    {"summary": "[P1] Cross-format consistency check (SVG vs draw.io)", "points": 5, "labels": ["phase-1", "compliance"]},
    {"summary": "[P1] Phase 1 retrospective and go/no-go gate", "points": 2, "labels": ["phase-1"]},
]

PHASE_2 = [
    {"summary": "[P2] Create 5\u201310 reusable templates for field engineering", "points": 8, "labels": ["phase-2", "enablement"]},
    {"summary": "[P2] Onboard field engineering team", "points": 5, "labels": ["phase-2", "enablement"]},
    {"summary": "[P2] Publish draw.io component library to Confluence/wiki", "points": 3, "labels": ["phase-2"]},
    {"summary": "[P2] Publish Penpot component library", "points": 5, "labels": ["phase-2"]},
    {"summary": "[P2] Write visual guidelines doc for unconstrained path", "points": 5, "labels": ["phase-2", "enablement"]},
    {"summary": "[P2] Build brand review checklist", "points": 2, "labels": ["phase-2", "enablement"]},
    {"summary": "[P2] Phase 2 retrospective and go/no-go gate", "points": 2, "labels": ["phase-2"]},
]

PHASE_3 = [
    {"summary": "[P3] Interactive web editor as internal tool", "points": 13, "labels": ["phase-3", "authoring-pipeline", "underestimate-risk"]},
    {"summary": "[P3] Web form/wizard for non-technical diagram definition", "points": 8, "labels": ["phase-3", "authoring-pipeline"]},
    {"summary": "[P3] Docs build pipeline integration (Sphinx or equivalent)", "points": 8, "labels": ["phase-3", "authoring-pipeline"]},
    {"summary": "[P3] Token change \u2192 rebuild \u2192 diff pipeline", "points": 5, "labels": ["phase-3", "compliance"]},
    {"summary": "[P3] Upstream spec watch (flag affected diagrams on spec changes)", "points": 5, "labels": ["phase-3"]},
    {"summary": "[P3] Mermaid-to-diagram parser", "points": 5, "labels": ["phase-3", "authoring-pipeline"]},
    {"summary": "[P3] Sketch-to-diagram AI intake", "points": 13, "labels": ["phase-3", "underestimate-risk"]},
    {"summary": "[P3] Accessibility layer (alt text, semantic SVG, WCAG)", "points": 5, "labels": ["phase-3"]},
    {"summary": "[P3] CI/CD validation hooks (fail builds on violations)", "points": 5, "labels": ["phase-3", "compliance"]},
]

ALL_PHASES = [
    ("Discovery", DISCOVERY_TASKS),
    ("Phase 0", PHASE_0),
    ("Phase 1", PHASE_1),
    ("Phase 2", PHASE_2),
    ("Phase 3", PHASE_3),
]


# ===== JIRA CLIENT =====


class JiraClient:
    """Minimal Jira Cloud REST API client."""

    def __init__(self, base_url: str, email: str, token: str):
        self.base_url = base_url.rstrip("/")
        creds = base64.b64encode(f"{email}:{token}".encode()).decode()
        self.session = requests.Session()
        self.session.headers.update({
            "Authorization": f"Basic {creds}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        })

    def _url(self, path: str) -> str:
        return f"{self.base_url}{path}"

    def create_issue(self, fields: dict[str, Any]) -> dict[str, Any]:
        resp = self.session.post(
            self._url("/rest/api/3/issue"),
            data=json.dumps({"fields": fields}),
        )
        resp.raise_for_status()
        return resp.json()

    def link_issues(
        self, inward_key: str, outward_key: str, link_type: str = "Blocks"
    ) -> None:
        payload = {
            "type": {"name": link_type},
            "inwardIssue": {"key": inward_key},
            "outwardIssue": {"key": outward_key},
        }
        resp = self.session.post(
            self._url("/rest/api/3/issueLink"),
            data=json.dumps(payload),
        )
        resp.raise_for_status()


def make_adf_doc(text: str) -> dict:
    """Wrap plain text in Atlassian Document Format."""
    return {
        "version": 1,
        "type": "doc",
        "content": [
            {
                "type": "paragraph",
                "content": [{"type": "text", "text": text}],
            }
        ],
    }


def create_structure(
    jira: Optional[JiraClient],
    project_key: str,
    dry_run: bool = False,
) -> None:
    print(f"\n{'=' * 60}")
    print(f"  Diagram System Epic — {'DRY RUN' if dry_run else 'LIVE'}")
    print(f"  Project: {project_key}")
    print(f"{'=' * 60}\n")

    # --- Epic ---
    epic_fields = {
        "project": {"key": project_key},
        "issuetype": {"name": "Epic"},
        "summary": EPIC["summary"],
        "description": make_adf_doc(EPIC["description"]),
        "labels": ["diagram-system"],
    }

    if dry_run:
        epic_key = f"{project_key}-EPIC"
        print(f"[DRY] Epic: {EPIC['summary']}")
    else:
        result = jira.create_issue(epic_fields)
        epic_key = result["key"]
        print(f"Created Epic: {epic_key} — {EPIC['summary']}")

    # --- Stories per phase ---
    created_keys: list[str] = []
    for phase_name, stories in ALL_PHASES:
        print(f"\n--- {phase_name} ({len(stories)} stories) ---")
        for story in stories:
            fields = {
                "project": {"key": project_key},
                "issuetype": {"name": "Story"},
                "summary": story["summary"],
                "labels": ["diagram-system"] + story.get("labels", []),
                STORY_POINTS_FIELD: story.get("points"),
            }
            if EPIC_LINK_FIELD:
                fields[EPIC_LINK_FIELD] = epic_key

            desc = story.get("description", "")
            if desc:
                fields["description"] = make_adf_doc(desc)

            if dry_run:
                key = f"{project_key}-{len(created_keys) + 1:03d}"
                print(f"  [DRY] {key}: {story['summary']} ({story.get('points', '?')} pts)")
            else:
                result = jira.create_issue(fields)
                key = result["key"]
                print(f"  Created {key}: {story['summary']}")

            created_keys.append(key)

    # --- Summary ---
    total_pts = sum(
        s.get("points", 0)
        for _, stories in ALL_PHASES
        for s in stories
    )
    print(f"\n{'=' * 60}")
    print(f"  Epic: {epic_key}")
    print(f"  Stories created: {len(created_keys)}")
    print(f"  Total story points: {total_pts}")
    print(f"{'=' * 60}\n")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Create Diagram System epic + stories in Jira"
    )
    parser.add_argument("--jira-url", required=True, help="e.g. https://jira.canonical.com")
    parser.add_argument("--email", required=True, help="Jira account email")
    parser.add_argument("--token", required=True, help="Jira API token")
    parser.add_argument("--project", required=True, help="Jira project key, e.g. DES")
    parser.add_argument("--dry-run", action="store_true", help="Print without creating")

    args = parser.parse_args()

    jira = None if args.dry_run else JiraClient(args.jira_url, args.email, args.token)

    try:
        create_structure(jira, args.project, dry_run=args.dry_run)
    except requests.exceptions.HTTPError as exc:
        print(f"\nJira API error: {exc}", file=sys.stderr)
        if exc.response is not None:
            print(exc.response.text, file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
