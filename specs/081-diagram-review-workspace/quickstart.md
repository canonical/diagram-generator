# Quickstart: Target User Workflow

This is the intended interface, not proof that the commands are implemented.

## Maintainer

```bash
diagram-review prepare \
  --adapter generator \
  --input diagrams/ \
  --output .diagram-review/review-set.json

diagram-review validate .diagram-review/review-set.json
diagram-review serve .diagram-review/review-set.json
```

Open the FigJam review plugin, connect to the local review service, inspect the
dry-run summary, and choose **Import**. After source changes, run `prepare`
again and choose **Refresh**; unchanged managed nodes and reviewer comments stay
in place.

After review:

```bash
diagram-review collect \
  --review-set .diagram-review/review-set.json \
  --output .diagram-review/findings.json

diagram-review route \
  --findings .diagram-review/findings.json \
  --adapter spec-kit \
  --select open,accepted
```

Registry or Jira publication is a separate explicit adapter action. Preview the
change plan before authorizing writes.

## Reviewer

1. Open the supplied FigJam link.
2. Survey the diagram groups and variants.
3. Leave a normal comment on the affected diagram.
4. State what is wrong, what you expected, and whether it blocks use.
5. Resolve the thread only when the issue is addressed or intentionally closed.

No repository access, YAML editing, issue template, or special comment syntax is
required.

## Visual designer finishing route

The generator creates layout, icons, and text; the generator's Figma plugin
places them as component instances for designer finishing. The review set links
canonical YAML, Figma file/node, and exported SVG/PNG in one entry so feedback
does not sever artifact lineage. Complex manual arrow routing remains a designer
finishing step until the Figma handoff supports it reliably.

## Safety

- Do not commit Figma, Jira, Coda, or registry credentials.
- Use dry-run for import, refresh, and external adapters.
- Do not embed private local files in a shared review set.
- Keep unresolved comments; do not guess their target.
- Re-collect after source updates so the registry can mark review freshness.
