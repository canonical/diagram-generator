import { describe, expect, it } from 'vitest';
import ELK from 'elkjs/lib/elk.bundled.js';

import {
  ELK_OPTION_AUDIT_REGISTRY_SPECS,
  ELK_OPTION_AUDITED_ALGORITHM_IDS,
  allExposedOfficialElkOptionIds,
  classifyOfficialElkOption,
  normalizeOfficialElkOptionId,
  type AuditedElkAlgorithmId,
} from '../src/elk-option-audit.js';

type ElkAlgorithmDescription = {
  id: string;
  knownOptions?: string[];
};

async function knownAlgorithms(): Promise<Map<string, ElkAlgorithmDescription>> {
  const elk = new ELK();
  const algorithms = await elk.knownLayoutAlgorithms() as ElkAlgorithmDescription[];
  return new Map(algorithms.map((algorithm) => [algorithm.id, algorithm]));
}

describe('ELK option discoverability audit', () => {
  it('classifies every elkjs option for enabled algorithms', async () => {
    const algorithms = await knownAlgorithms();
    const missing: string[] = [];

    for (const algorithmId of ELK_OPTION_AUDITED_ALGORITHM_IDS) {
      const algorithm = algorithms.get(algorithmId);
      expect(algorithm, `missing elkjs algorithm metadata for ${algorithmId}`).toBeDefined();
      for (const optionId of algorithm?.knownOptions ?? []) {
        if (!classifyOfficialElkOption(optionId, algorithmId)) {
          missing.push(`${algorithmId}: ${optionId}`);
        }
      }
    }

    expect(missing).toEqual([]);
  });

  it('requires every exposed option to be classified as authorable for its engine', () => {
    for (const algorithmId of ELK_OPTION_AUDITED_ALGORITHM_IDS) {
      for (const spec of ELK_OPTION_AUDIT_REGISTRY_SPECS[algorithmId]) {
        expect(
          classifyOfficialElkOption(spec.key, algorithmId),
          `${algorithmId}: ${spec.key}`,
        ).toMatchObject({ category: 'authorable-and-exposed' });
      }
    }
  });

  it('requires exposed controls to carry enough UI metadata to avoid hidden knobs', () => {
    for (const [algorithmId, specs] of Object.entries(ELK_OPTION_AUDIT_REGISTRY_SPECS) as [
      AuditedElkAlgorithmId,
      typeof ELK_OPTION_AUDIT_REGISTRY_SPECS[AuditedElkAlgorithmId],
    ][]) {
      const seen = new Set<string>();
      for (const spec of specs) {
        const officialId = normalizeOfficialElkOptionId(spec.key);
        expect(seen.has(officialId), `${algorithmId}: duplicate ${spec.key}`).toBe(false);
        seen.add(officialId);
        expect(spec.label, `${algorithmId}: missing label for ${spec.key}`).toBeTruthy();
        expect(spec.group, `${algorithmId}: missing group for ${spec.key}`).toBeTruthy();
        expect(spec.description, `${algorithmId}: missing description for ${spec.key}`).toBeTruthy();
        expect(spec.defaultValue, `${algorithmId}: defaultValue must be a string for ${spec.key}`)
          .not.toBeUndefined();
        if (spec.kind === 'number') {
          expect(spec.min, `${algorithmId}: missing min for ${spec.key}`).toBeDefined();
          expect(spec.max, `${algorithmId}: missing max for ${spec.key}`).toBeDefined();
          expect(spec.step, `${algorithmId}: missing step for ${spec.key}`).toBeDefined();
        }
        if (spec.kind === 'enum') {
          expect(spec.enumValues?.length ?? 0, `${algorithmId}: missing enumValues for ${spec.key}`)
            .toBeGreaterThan(0);
        }
      }
    }
  });

  it('keeps known authorable YAML keys inside the exposed option set', () => {
    const exposed = allExposedOfficialElkOptionIds();
    expect(exposed.has('org.eclipse.elk.edgeLabels.inline')).toBe(true);
    expect(exposed.has('org.eclipse.elk.spacing.edgeLabel')).toBe(true);
    expect(exposed.has('org.eclipse.elk.layered.highDegreeNodes.treatment')).toBe(true);
    expect(exposed.has('org.eclipse.elk.force.repulsivePower')).toBe(true);
  });
});
