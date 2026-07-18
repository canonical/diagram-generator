import { parse } from "yaml";

/**
 * Parse authored workspace YAML without registering executable/custom tags.
 * Every preview source supplies raw text to this one parser after source
 * resolution, so local folders and server roots share the same safety policy.
 */
export function parsePreviewYaml(raw: string): unknown {
  return parse(raw, {
    customTags: [],
    logLevel: "silent",
    maxAliasCount: 100,
  });
}
