import type { SequenceDiagramSpec, SequenceGroup, SequenceMessage, SequenceNote, SequenceParticipant } from './model.js';
import {
  estimateSharedBoxTextHeight,
  estimateSharedBoxTextWidth,
  SHARED_BOX_RHYTHM,
} from '../shared-box-rhythm.js';

export interface SequenceLayoutParticipantBox {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  participant: SequenceParticipant;
}

export interface SequenceLayoutMessageRow {
  id: string;
  y: number;
  fromParticipantId: string;
  toParticipantId: string;
  fromX: number;
  toX: number;
  message: SequenceMessage;
}

export interface SequenceLayoutNoteBox {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  targetParticipantId: string;
  placement: SequenceNote['placement'];
  note: SequenceNote;
}

export interface SequenceLayoutGroupSpan {
  id: string;
  y: number;
  startMessageId: string;
  endMessageId: string;
  group: SequenceGroup;
}

export interface SequenceLayoutResult {
  width: number;
  height: number;
  participants: SequenceLayoutParticipantBox[];
  messages: SequenceLayoutMessageRow[];
  notes: SequenceLayoutNoteBox[];
  groups: SequenceLayoutGroupSpan[];
}

export interface SequenceLayoutConfig {
  participantWidth?: number;
  participantHeight?: number;
  participantGap?: number;
  topPadding?: number;
  sidePadding?: number;
  messageStartY?: number;
  messageRowGap?: number;
  noteWidth?: number;
  noteHeight?: number;
}

const DEFAULT_CONFIG: Required<SequenceLayoutConfig> = {
  participantWidth: 176,
  participantHeight: SHARED_BOX_RHYTHM.minBoxHeight,
  participantGap: 96,
  topPadding: 48,
  sidePadding: 48,
  messageStartY: 152,
  messageRowGap: 88,
  noteWidth: 160,
  noteHeight: SHARED_BOX_RHYTHM.minBoxHeight,
};

export function layoutSequenceDiagram(
  spec: SequenceDiagramSpec,
  config: SequenceLayoutConfig = {},
): SequenceLayoutResult {
  const resolved = { ...DEFAULT_CONFIG, ...config };
  let nextParticipantX = resolved.sidePadding;
  const participants = spec.participants.map((participant) => {
    const width = Math.max(
      resolved.participantWidth,
      Math.ceil(estimateSharedBoxTextWidth(participant.label) + (SHARED_BOX_RHYTHM.textInset * 2)),
    );
    const height = Math.max(
      resolved.participantHeight,
      Math.ceil(estimateSharedBoxTextHeight(participant.label) + (SHARED_BOX_RHYTHM.textInset * 2)),
    );
    const box = {
      id: participant.id,
      x: nextParticipantX,
      y: resolved.topPadding,
      width,
      height,
      participant,
    };
    nextParticipantX += width + resolved.participantGap;
    return box;
  });

  const participantCenters = new Map(participants.map((participant) => [
    participant.id,
    participant.x + participant.width / 2,
  ]));

  const messages = spec.messages.map((message, index) => ({
    id: message.id,
    y: resolved.messageStartY + index * resolved.messageRowGap,
    fromParticipantId: message.from,
    toParticipantId: message.to,
    fromX: participantCenters.get(message.from) ?? resolved.sidePadding,
    toX: participantCenters.get(message.to) ?? resolved.sidePadding,
    message,
  }));

  const messageRowsById = new Map(messages.map((message) => [message.id, message]));
  const notes = spec.notes.map((note, index) => {
    const participant = participants.find((entry) => entry.id === note.target);
    const anchorX = participant?.x ?? resolved.sidePadding;
    const participantWidth = participant?.width ?? resolved.participantWidth;
    const anchorY = resolved.messageStartY + index * resolved.messageRowGap;
    const noteWidth = Math.max(
      resolved.noteWidth,
      Math.ceil(estimateSharedBoxTextWidth(note.label) + (SHARED_BOX_RHYTHM.textInset * 2)),
    );
    const noteHeight = Math.max(
      resolved.noteHeight,
      Math.ceil(estimateSharedBoxTextHeight(note.label) + (SHARED_BOX_RHYTHM.textInset * 2)),
    );
    const x = note.placement === 'left-of'
      ? anchorX - noteWidth - 24
      : note.placement === 'right-of'
        ? anchorX + participantWidth + 24
        : anchorX + (participantWidth - noteWidth) / 2;
    return {
      id: note.id,
      x,
      y: anchorY,
      width: noteWidth,
      height: noteHeight,
      targetParticipantId: note.target,
      placement: note.placement,
      note,
    };
  });

  const groups = spec.groups.map((group) => ({
    id: group.id,
    y: messageRowsById.get(group.startMessageId)?.y ?? resolved.messageStartY,
    startMessageId: group.startMessageId,
    endMessageId: group.endMessageId,
    group,
  }));

  const rightMostParticipant = participants[participants.length - 1];
  const participantWidth = rightMostParticipant
    ? rightMostParticipant.x + rightMostParticipant.width + resolved.sidePadding
    : resolved.sidePadding * 2;
  const noteWidth = notes.length > 0
    ? Math.max(...notes.map((note) => note.x + note.width + resolved.sidePadding))
    : 0;
  const width = Math.max(participantWidth, noteWidth);
  const lastMessage = messages[messages.length - 1];
  const lastNote = notes[notes.length - 1];
  const height = Math.max(
    resolved.messageStartY,
    (lastMessage?.y ?? resolved.messageStartY) + resolved.messageRowGap,
    (lastNote?.y ?? 0) + resolved.noteHeight + resolved.topPadding,
  );

  return {
    width,
    height,
    participants,
    messages,
    notes,
    groups,
  };
}
