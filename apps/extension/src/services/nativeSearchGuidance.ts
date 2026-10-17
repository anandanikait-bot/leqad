import type { GuidanceActionId } from './guidanceRegistry';

export interface NativeSearchGuidanceDefinition {
  platform: 'onshape';
  actionId: GuidanceActionId;
  commandName: string;
  requiredContext: 'SKETCH_EDITING';
  shortcut: { windows: string; macOS: string };
  instructions: readonly string[];
  distinction: string;
  panelOverlap: string;
  verificationBoundary: string;
}

const ONSHAPE_NATIVE_SEARCH_GUIDANCE: Partial<
  Record<GuidanceActionId, NativeSearchGuidanceDefinition>
> = {
  'rectangle-tool-group': {
    platform: 'onshape',
    actionId: 'rectangle-tool-group',
    commandName: 'Corner rectangle',
    requiredContext: 'SKETCH_EDITING',
    shortcut: { windows: 'Alt + C', macOS: 'Option + C' },
    instructions: [
      'Open Search Tools from the Onshape toolbar, or press Alt + C on Windows or Option + C on macOS.',
      'Search for Corner rectangle and select the result named exactly Corner rectangle. Do not choose another Rectangle variant.',
      'If Search Tools is hidden, right-click the toolbar and choose Show Search tools. If the exact command is missing or unavailable, press Escape and use the lesson text; do not choose a different variant or mark the CAD action as verified.',
      'To locate the toolbar control, enable Highlight tool in toolbar and hover over the exact search result. This is Onshape’s own temporary yellow highlight; it may disappear when the pointer moves onto the control.',
    ],
    distinction:
      'Corner rectangle uses two opposite corners. Center point rectangle starts from its center. Aligned Rectangle establishes a line direction, then a perpendicular width. These are different tools.',
    panelOverlap:
      'If Leqad covers Search Tools, drag the Leqad panel by its header or collapse it, then expand it when you return.',
    verificationBoundary:
      'Leqad did not select the tool. Search results and native highlighting do not verify tool activation, drawn geometry, or dimensions. Lesson progress stays self-reported.',
  },
};

export function getOnshapeNativeSearchGuidance(
  actionId: GuidanceActionId | null,
): NativeSearchGuidanceDefinition | null {
  if (!actionId) return null;
  return ONSHAPE_NATIVE_SEARCH_GUIDANCE[actionId] ?? null;
}
