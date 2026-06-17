/**
 * Selection state mutation helpers (spec 043 interaction slice B).
 */

export interface SelectionStateSnapshot {
  selectedIds: string[];
  selectionDepth: number;
}

export type SelectionStateMutation =
  | { kind: 'clear' }
  | { kind: 'toggle'; targetId: string }
  | { kind: 'replace'; targetId: string; nextSelectionDepth: number }
  | { kind: 'replace-many'; targetIds: Iterable<string>; nextSelectionDepth: number };

function uniqueIds(ids: Iterable<string>): string[] {
  return [...new Set(ids)].filter(Boolean);
}

export function applySelectionStateMutation(
  state: SelectionStateSnapshot,
  mutation: SelectionStateMutation,
): SelectionStateSnapshot {
  switch (mutation.kind) {
    case 'clear':
      return { selectedIds: [], selectionDepth: 0 };
    case 'toggle': {
      const nextSelectedIds = new Set(state.selectedIds);
      if (nextSelectedIds.has(mutation.targetId)) nextSelectedIds.delete(mutation.targetId);
      else nextSelectedIds.add(mutation.targetId);
      return {
        selectedIds: [...nextSelectedIds],
        selectionDepth: Math.max(0, state.selectionDepth),
      };
    }
    case 'replace':
      return {
        selectedIds: [mutation.targetId],
        selectionDepth: Math.max(0, mutation.nextSelectionDepth),
      };
    case 'replace-many':
      return {
        selectedIds: uniqueIds(mutation.targetIds),
        selectionDepth: Math.max(0, mutation.nextSelectionDepth),
      };
    default:
      return state;
  }
}
