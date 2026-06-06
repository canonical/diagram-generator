export type SequenceParticipantKind = 'participant' | 'actor' | 'boundary' | 'control' | 'entity' | 'database';

export type SequenceNotePlacement = 'left-of' | 'right-of' | 'over';

export interface SequenceLine {
  text: string;
}

export interface SequenceParticipantInput {
  id: string;
  label: string | string[];
  kind?: SequenceParticipantKind;
}

export interface SequenceParticipant {
  id: string;
  label: SequenceLine[];
  kind: SequenceParticipantKind;
}

export interface SequenceMessageInput {
  id?: string;
  from: string;
  to: string;
  label: string | string[];
}

export interface SequenceMessage {
  id: string;
  from: string;
  to: string;
  label: SequenceLine[];
}

export interface SequenceNoteInput {
  id?: string;
  target: string;
  placement?: SequenceNotePlacement;
  label: string | string[];
}

export interface SequenceNote {
  id: string;
  target: string;
  placement: SequenceNotePlacement;
  label: SequenceLine[];
}

export interface SequenceGroupInput {
  id: string;
  label: string | string[];
  startMessageId: string;
  endMessageId: string;
}

export interface SequenceGroup {
  id: string;
  label: SequenceLine[];
  startMessageId: string;
  endMessageId: string;
}

export interface SequenceDiagramInput {
  participants: SequenceParticipantInput[];
  messages: SequenceMessageInput[];
  notes?: SequenceNoteInput[];
  groups?: SequenceGroupInput[];
}

export interface SequenceDiagramSpec {
  participants: SequenceParticipant[];
  messages: SequenceMessage[];
  notes: SequenceNote[];
  groups: SequenceGroup[];
}

export interface SequenceModelDiagnostic {
  code:
    | 'SEQUENCE_DUPLICATE_PARTICIPANT'
    | 'SEQUENCE_UNKNOWN_MESSAGE_ENDPOINT'
    | 'SEQUENCE_DUPLICATE_MESSAGE_ID'
    | 'SEQUENCE_UNKNOWN_NOTE_TARGET'
    | 'SEQUENCE_UNKNOWN_GROUP_MESSAGE';
  message: string;
  path: string;
}

export interface NormalizeSequenceDiagramResult {
  spec: SequenceDiagramSpec;
  errors: SequenceModelDiagnostic[];
}

function normalizeLabel(value: string | string[]): SequenceLine[] {
  if (Array.isArray(value)) return value.map((text) => ({ text: String(text) }));
  return [{ text: String(value) }];
}

export function normalizeSequenceDiagram(input: SequenceDiagramInput): NormalizeSequenceDiagramResult {
  const errors: SequenceModelDiagnostic[] = [];

  const seenParticipantIds = new Set<string>();
  const participants: SequenceParticipant[] = input.participants.map((participant, index) => {
    if (seenParticipantIds.has(participant.id)) {
      errors.push({
        code: 'SEQUENCE_DUPLICATE_PARTICIPANT',
        message: `Duplicate participant id \"${participant.id}\".`,
        path: `participants[${index}]`,
      });
    }
    seenParticipantIds.add(participant.id);
    return {
      id: participant.id,
      label: normalizeLabel(participant.label),
      kind: participant.kind ?? 'participant',
    };
  });

  const participantIdSet = new Set(participants.map((participant) => participant.id));
  const seenMessageIds = new Set<string>();
  const messages: SequenceMessage[] = input.messages.map((message, index) => {
    const id = message.id ?? `m${index + 1}`;
    if (seenMessageIds.has(id)) {
      errors.push({
        code: 'SEQUENCE_DUPLICATE_MESSAGE_ID',
        message: `Duplicate message id \"${id}\".`,
        path: `messages[${index}]`,
      });
    }
    seenMessageIds.add(id);
    if (!participantIdSet.has(message.from)) {
      errors.push({
        code: 'SEQUENCE_UNKNOWN_MESSAGE_ENDPOINT',
        message: `Unknown message source participant \"${message.from}\".`,
        path: `messages[${index}].from`,
      });
    }
    if (!participantIdSet.has(message.to)) {
      errors.push({
        code: 'SEQUENCE_UNKNOWN_MESSAGE_ENDPOINT',
        message: `Unknown message target participant \"${message.to}\".`,
        path: `messages[${index}].to`,
      });
    }
    return {
      id,
      from: message.from,
      to: message.to,
      label: normalizeLabel(message.label),
    };
  });

  const messageIdSet = new Set(messages.map((message) => message.id));
  const notes: SequenceNote[] = (input.notes ?? []).map((note, index) => {
    if (!participantIdSet.has(note.target)) {
      errors.push({
        code: 'SEQUENCE_UNKNOWN_NOTE_TARGET',
        message: `Unknown note target participant \"${note.target}\".`,
        path: `notes[${index}].target`,
      });
    }
    return {
      id: note.id ?? `note${index + 1}`,
      target: note.target,
      placement: note.placement ?? 'over',
      label: normalizeLabel(note.label),
    };
  });

  const groups: SequenceGroup[] = (input.groups ?? []).map((group, index) => {
    if (!messageIdSet.has(group.startMessageId)) {
      errors.push({
        code: 'SEQUENCE_UNKNOWN_GROUP_MESSAGE',
        message: `Unknown group start message \"${group.startMessageId}\".`,
        path: `groups[${index}].startMessageId`,
      });
    }
    if (!messageIdSet.has(group.endMessageId)) {
      errors.push({
        code: 'SEQUENCE_UNKNOWN_GROUP_MESSAGE',
        message: `Unknown group end message \"${group.endMessageId}\".`,
        path: `groups[${index}].endMessageId`,
      });
    }
    return {
      id: group.id,
      label: normalizeLabel(group.label),
      startMessageId: group.startMessageId,
      endMessageId: group.endMessageId,
    };
  });

  return {
    spec: {
      participants,
      messages,
      notes,
      groups,
    },
    errors,
  };
}