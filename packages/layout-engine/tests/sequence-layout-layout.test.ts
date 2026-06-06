import { describe, expect, it } from 'vitest';

import { layoutSequenceDiagram, normalizeSequenceDiagram } from '../src/index.js';

describe('layoutSequenceDiagram', () => {
  it('places participant columns left-to-right and message rows top-to-bottom', () => {
    const normalized = normalizeSequenceDiagram({
      participants: [
        { id: 'user', kind: 'actor', label: 'User' },
        { id: 'api', label: 'Public API' },
        { id: 'db', kind: 'database', label: 'Database' },
      ],
      messages: [
        { id: 'm-request', from: 'user', to: 'api', label: 'GET /v1/things' },
        { id: 'm-query', from: 'api', to: 'db', label: 'SELECT things' },
      ],
      notes: [
        { id: 'note-auth', target: 'api', placement: 'right-of', label: 'Auth happens here' },
      ],
    });

    const layout = layoutSequenceDiagram(normalized.spec);

    expect(layout.participants.map((participant) => participant.id)).toEqual(['user', 'api', 'db']);
    expect(layout.participants[0]!.x).toBeLessThan(layout.participants[1]!.x);
    expect(layout.participants[1]!.x).toBeLessThan(layout.participants[2]!.x);
    expect(layout.messages.map((message) => message.id)).toEqual(['m-request', 'm-query']);
    expect(layout.messages[0]!.y).toBeLessThan(layout.messages[1]!.y);
    expect(layout.messages[0]).toMatchObject({
      fromParticipantId: 'user',
      toParticipantId: 'api',
    });
    expect(layout.notes[0]).toMatchObject({
      id: 'note-auth',
      targetParticipantId: 'api',
      placement: 'right-of',
    });
    expect(layout.width).toBeGreaterThan(0);
    expect(layout.height).toBeGreaterThan(layout.messages[1]!.y);
  });
});