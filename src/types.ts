export type Scope = 'current' | 'all';
export type NodeKind = 'FRAME' | 'SECTION';
export type DevStatusType = 'READY_FOR_DEV' | 'COMPLETED';
export type SetStatusType = DevStatusType;
export type FilterStatus = 'ALL' | DevStatusType;

export interface NodeInfo {
  id: string;
  name: string;
  type: NodeKind;
  status: DevStatusType;
  pageName: string;
  pageId: string;
}

// ── UI → Plugin ──────────────────────────────────────────────────────────────
export type UiMessage =
  | { type: 'SCAN'; scope: Scope }
  | { type: 'SET_STATUS'; nodeIds: string[]; status: SetStatusType }
  | { type: 'SELECT_NODES'; nodeIds: string[] }
  | { type: 'NAVIGATE_TO_NODE'; nodeId: string; pageId: string };

// ── Plugin → UI ──────────────────────────────────────────────────────────────
export type PluginMessage =
  | { type: 'SCAN_RESULT'; nodes: NodeInfo[]; scope: Scope }
  | { type: 'STATUS_UPDATED'; updates: Array<{ nodeId: string; status: DevStatusType }> }
  | { type: 'ERROR'; message: string };
