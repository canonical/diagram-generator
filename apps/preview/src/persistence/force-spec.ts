import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const yaml = require("yaml") as {
  stringify: (value: unknown, options?: Record<string, unknown>) => string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function persistForceSpecToYaml(payload: unknown): string {
  if (!isRecord(payload) || !Array.isArray(payload.nodes) || !Array.isArray(payload.links)) {
    throw new Error("Expected authored force spec JSON payload");
  }
  const simulation = payload.simulation;
  if (isRecord(simulation) && isRecord(simulation.params)) {
    throw new Error("Expected authored force spec JSON payload, not runtime snapshot state");
  }
  return yaml.stringify(payload, {
    aliasDuplicateObjects: false,
    lineWidth: 1000,
    sortMapEntries: false,
  });
}
