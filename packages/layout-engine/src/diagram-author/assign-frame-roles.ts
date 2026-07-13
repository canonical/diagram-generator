import { extractBaseFrameId } from './ref-grammar.js';
import type { AuthorArrow, AuthorFrameNode, Diagnostic } from './types.js';

const ROOT_EDGE_SOURCE_SECTION_TARGET_PARENT = 'root-edge-source-section-target-parent';

function readFrameRoleStrategy(source: Record<string, unknown>): string | null {
  const meta = source.meta;
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) {
    return null;
  }
  const frameRoles = (meta as Record<string, unknown>).frame_roles;
  if (!frameRoles || typeof frameRoles !== 'object' || Array.isArray(frameRoles)) {
    return null;
  }
  const strategy = (frameRoles as Record<string, unknown>).strategy;
  return typeof strategy === 'string' ? strategy : null;
}

function collectParentById(root: AuthorFrameNode): Map<string, string | null> {
  const parentById = new Map<string, string | null>();
  const visit = (node: AuthorFrameNode, parentId: string | null): void => {
    if (node.id) {
      parentById.set(node.id, parentId);
    }
    for (const child of node.children) {
      visit(child, node.id || parentId);
    }
  };
  visit(root, null);
  return parentById;
}

function rootChildForFrameId(
  frameId: string,
  rootChildIds: Set<string>,
  parentById: Map<string, string | null>,
): string | null {
  let current: string | null | undefined = frameId;
  while (current) {
    if (rootChildIds.has(current)) {
      return current;
    }
    current = parentById.get(current);
  }
  return null;
}

function applyRootEdgeSourceSectionTargetParent(
  root: AuthorFrameNode,
  arrows: AuthorArrow[],
): void {
  const rootChildren = root.children.filter((child) => child.id);
  const rootChildIds = new Set(rootChildren.map((child) => child.id));
  const parentById = collectParentById(root);
  const sourceRootIds = new Set<string>();
  const targetRootIds = new Set<string>();

  for (const arrow of arrows) {
    const sourceId = extractBaseFrameId(arrow.source);
    const targetId = extractBaseFrameId(arrow.target);
    if (!sourceId || !targetId) {
      continue;
    }
    const sourceRootId = rootChildForFrameId(sourceId, rootChildIds, parentById);
    const targetRootId = rootChildForFrameId(targetId, rootChildIds, parentById);
    if (!sourceRootId || !targetRootId || sourceRootId === targetRootId) {
      continue;
    }
    sourceRootIds.add(sourceRootId);
    targetRootIds.add(targetRootId);
  }

  for (const child of rootChildren) {
    if (child.level != null) {
      continue;
    }
    if (sourceRootIds.has(child.id)) {
      child.level = 3;
    } else if (targetRootIds.has(child.id)) {
      child.level = 2;
    }
  }
}

export function applyConfiguredFrameRoleAssignment(
  root: AuthorFrameNode | null,
  arrows: AuthorArrow[],
  source: Record<string, unknown>,
): Diagnostic[] {
  if (!root) {
    return [];
  }
  const strategy = readFrameRoleStrategy(source);
  if (!strategy) {
    return [];
  }
  if (strategy === ROOT_EDGE_SOURCE_SECTION_TARGET_PARENT) {
    applyRootEdgeSourceSectionTargetParent(root, arrows);
    return [];
  }
  return [{
    code: 'UNSUPPORTED_FRAME_ROLE_STRATEGY',
    level: 'warning',
    message: `Unsupported frame role assignment strategy: ${strategy}`,
    path: 'meta.frame_roles.strategy',
  }];
}
