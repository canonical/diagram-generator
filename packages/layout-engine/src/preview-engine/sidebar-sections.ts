import type { PreviewEngineHostView, PreviewViewerSidebarSection } from './types.js';

export const CANONICAL_LAYOUT_PARAMS_SIDEBAR_SECTION = 'layout-params' as const;

export const LEGACY_LAYOUT_PARAMS_SIDEBAR_SECTIONS = [
  'elk-layout',
  'graph-layout',
] as const satisfies readonly PreviewViewerSidebarSection[];

export const LAYOUT_PARAMS_SIDEBAR_SECTION_ALIASES = [
  CANONICAL_LAYOUT_PARAMS_SIDEBAR_SECTION,
  ...LEGACY_LAYOUT_PARAMS_SIDEBAR_SECTIONS,
] as const satisfies readonly PreviewViewerSidebarSection[];

export function isLayoutParamsSidebarSection(
  section: string | null | undefined,
): section is PreviewViewerSidebarSection {
  return Boolean(section) && LAYOUT_PARAMS_SIDEBAR_SECTION_ALIASES.includes(
    section as (typeof LAYOUT_PARAMS_SIDEBAR_SECTION_ALIASES)[number],
  );
}

export function sidebarSectionsUseLayoutParams(
  sidebarSections: ReadonlyArray<string> | null | undefined,
): boolean {
  return (sidebarSections ?? []).some((section) => isLayoutParamsSidebarSection(section));
}

export function hostViewUsesLayoutParamsSection(
  hostView: Pick<PreviewEngineHostView, 'sidebarSections'> | null | undefined,
): boolean {
  return sidebarSectionsUseLayoutParams(hostView?.sidebarSections);
}
