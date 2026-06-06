import { describe, expect, it } from 'vitest';

import { normalizeSequenceDiagram } from '../src/index.js';

describe('normalizeSequenceDiagram', () => {
  it('normalizes labels and generates stable default ids', () => {
    const result = normalizeSequenceDiagram({
      participants: [
        { id: 'user', label: 'User', kind: 'actor' },
        { id: 'api', label: ['Public', 'API'] },
      ],
      messages: [
        { from: 'user', to: 'api', label: 'GET /v1/things' },
      ],
      notes: [
        { target: 'api', label: 'Auth happens here' },
      ],
    });

    expect(result.errors).toEqual([]);
    expect(result.spec.participants).toEqual([
      { id: 'user', kind: 'actor', label: [{ text: 'User' }] },
      { id: 'api', kind: 'participant', label: [{ text: 'Public' }, { text: 'API' }] },
    ]);
    expect(result.spec.messages[0]).toEqual({
      id: 'm1',
      from: 'user',
      to: 'api',
      label: [{ text: 'GET /v1/things' }],
    });
    expect(result.spec.notes[0]).toEqual({
      id: 'note1',
      target: 'api',
      placement: 'over',
      label: [{ text: 'Auth happens here' }],
    });
  });

  it('reports duplicate participants and unknown message endpoints', () => {
    const result = normalizeSequenceDiagram({
      participants: [
        { id: 'user', label: 'User' },
        { id: 'user', label: 'Duplicate user' },
      ],
      messages: [
        { id: 'req', from: 'user', to: 'missing', label: 'request' },
      ],
    });

    expect(result.errors).toEqual([
      expect.objectContaining({ code: 'SEQUENCE_DUPLICATE_PARTICIPANT', path: 'participants[1]' }),
      expect.objectContaining({ code: 'SEQUENCE_UNKNOWN_MESSAGE_ENDPOINT', path: 'messages[0].to' }),
    ]);
  });

  it('reports unknown note and group references', () => {
    const result = normalizeSequenceDiagram({
      participants: [
        { id: 'client', label: 'Client' },
        { id: 'server', label: 'Server' },
      ],
      messages: [
        { id: 'm-request', from: 'client', to: 'server', label: 'request' },
      ],
      notes: [
        { target: 'db', label: 'Missing target' },
      ],
      groups: [
        { id: 'g1', label: 'Round trip', startMessageId: 'm-request', endMessageId: 'm-missing' },
      ],
    });

    expect(result.errors).toEqual([
      expect.objectContaining({ code: 'SEQUENCE_UNKNOWN_NOTE_TARGET', path: 'notes[0].target' }),
      expect.objectContaining({ code: 'SEQUENCE_UNKNOWN_GROUP_MESSAGE', path: 'groups[0].endMessageId' }),
    ]);
  });
});