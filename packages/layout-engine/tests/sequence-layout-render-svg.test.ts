import { describe, expect, it } from 'vitest';

import {
  layoutSequenceDiagram,
  normalizeSequenceDiagram,
  renderSequenceDiagramToSvg,
} from '../src/index.js';

describe('renderSequenceDiagramToSvg', () => {
  it('renders branded participant headers, lifelines, messages, and notes as repo-owned SVG', () => {
    const normalized = normalizeSequenceDiagram({
      participants: [
        { id: 'user', kind: 'actor', label: 'User' },
        { id: 'api', label: 'Public API' },
      ],
      messages: [
        { id: 'm-request', from: 'user', to: 'api', label: 'GET /v1/things' },
      ],
      notes: [
        { id: 'note-auth', target: 'api', placement: 'right-of', label: 'Auth happens here' },
      ],
    });
    const layout = layoutSequenceDiagram(normalized.spec);

    const svg = renderSequenceDiagramToSvg(normalized.spec, layout, { title: 'Sequence demo' });

    expect(svg).toContain('<svg');
    expect(svg).toContain('aria-label="Sequence demo"');
    expect(svg).toContain('data-sequence-participant-id="user"');
    expect(svg).toContain('data-sequence-participant-id="api"');
    expect(svg).toContain('data-sequence-message-id="m-request"');
    expect(svg).toContain('data-sequence-note-id="note-auth"');
    expect(svg).toContain('<rect x="520" y="152" width="188" height="64"');
    expect(svg).toContain('GET /v1/things');
    expect(svg).toContain('Auth happens here');
    expect(svg).toContain('#E95420');
    expect(svg).toContain('stroke-dasharray="8 8"');
    expect(svg).toContain('stroke="#000000"');
    expect(svg).not.toContain('fill="#111111"');
    expect(svg).not.toContain('#C7162B');
  });

  it('expands the canvas to include right-of notes', () => {
    const normalized = normalizeSequenceDiagram({
      participants: [
        { id: 'client', kind: 'actor', label: 'Client' },
        { id: 'api', label: ['Public', 'API'] },
      ],
      messages: [
        { id: 'm-request', from: 'client', to: 'api', label: 'GET /v1/handshake' },
      ],
      notes: [
        { id: 'note-auth', target: 'api', placement: 'right-of', label: 'Auth happens here' },
      ],
    });

    const layout = layoutSequenceDiagram(normalized.spec);
    const rightMostNote = Math.max(...layout.notes.map((note) => note.x + note.width));
    const svg = renderSequenceDiagramToSvg(normalized.spec, layout, { title: 'Service handshake sequence' });

    expect(layout.width).toBeGreaterThan(rightMostNote);
    expect(svg).toContain(`width="${layout.width}"`);
    expect(svg).toContain('Auth happens here');
  });

  it('orients arrowheads toward the target for leftward return messages', () => {
    const normalized = normalizeSequenceDiagram({
      participants: [
        { id: 'user', kind: 'actor', label: 'User' },
        { id: 'api', label: 'API gateway' },
      ],
      messages: [
        { id: 'm-return', from: 'api', to: 'user', label: 'JSON response' },
      ],
    });
    const layout = layoutSequenceDiagram(normalized.spec);

    const svg = renderSequenceDiagramToSvg(normalized.spec, layout, { title: 'Return flow' });

    expect(svg).toContain('data-sequence-message-id="m-return"');
    expect(svg).toContain('<polygon points="136,152 146.84,149.09 146.84,154.91"');
  });
});
