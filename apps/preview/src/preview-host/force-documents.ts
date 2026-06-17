import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

export interface ForcePreviewDocumentDeps {
  readonly forceDefinitionsDir: string;
}

export type ParseYaml = (raw: string) => unknown;

export function readForceSpec(slug: string, deps: ForcePreviewDocumentDeps, parseYaml: ParseYaml): unknown {
  const specPath = path.join(deps.forceDefinitionsDir, `${slug}.yaml`);
  if (!existsSync(specPath)) return null;
  return parseYaml(readFileSync(specPath, "utf8"));
}

export function canonicalForceSavedState(slug: string, deps: ForcePreviewDocumentDeps, parseYaml: ParseYaml) {
  const authoredSpec = readForceSpec(slug, deps, parseYaml);
  if (!authoredSpec) {
    throw new Error(`Canonical force spec not found after save: ${slug}`);
  }
  return {
    slug,
    authoredSpec,
  };
}
