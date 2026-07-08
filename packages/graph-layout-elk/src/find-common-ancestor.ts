export interface TreeData {
  parentById: Record<string, string | undefined>;
  childrenById: Record<string, string[]>;
}

export function findCommonAncestor(id1: string, id2: string, { parentById }: TreeData): string {
  const visited = new Set<string>();
  let currentId: string | undefined = id1;

  // Mermaid treats self-edges as owned by the parent container, or root.
  if (id1 === id2) {
    return parentById[id1] ?? 'root';
  }

  while (currentId) {
    visited.add(currentId);
    if (currentId === id2) {
      return currentId;
    }
    currentId = parentById[currentId];
  }

  currentId = id2;
  while (currentId) {
    if (visited.has(currentId)) {
      return currentId;
    }
    currentId = parentById[currentId];
  }

  return 'root';
}
