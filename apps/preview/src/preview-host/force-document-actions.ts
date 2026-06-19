import { existsSync, writeFileSync } from "node:fs";
import path from "node:path";

import { persistForceSpecToYaml } from "../persistence/index.js";
import {
  canonicalForceSavedState,
  readForceSpec,
  type ForcePreviewDocumentDeps,
  type ParseYaml,
} from "./force-documents.js";

export interface ForcePreviewDocumentActionDeps {
  readonly forcePreviewDocumentDeps: ForcePreviewDocumentDeps;
  readonly parseYaml: ParseYaml;
}

function forceSpecPathForSlug(slug: string, deps: ForcePreviewDocumentActionDeps): string {
  return path.join(deps.forcePreviewDocumentDeps.forceDefinitionsDir, `${slug}.yaml`);
}

export function loadForcePreviewDocumentSpec(
  slug: string,
  deps: ForcePreviewDocumentActionDeps,
): unknown {
  const spec = readForceSpec(slug, deps.forcePreviewDocumentDeps, deps.parseYaml);
  if (!spec) {
    throw new Error(`Unknown force example: ${slug}`);
  }
  return spec;
}

export function saveForcePreviewDocument(
  slug: string,
  payload: unknown,
  deps: ForcePreviewDocumentActionDeps,
): unknown {
  const specPath = forceSpecPathForSlug(slug, deps);
  if (!existsSync(specPath)) {
    throw new Error(`Unknown force example: ${slug}`);
  }

  const nextText = persistForceSpecToYaml(payload);
  writeFileSync(specPath, nextText, "utf8");
  return {
    ok: true,
    canonicalState: canonicalForceSavedState(
      slug,
      deps.forcePreviewDocumentDeps,
      deps.parseYaml,
    ),
  };
}
