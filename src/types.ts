export type Scope = 'current' | 'all';
export type NodeKind = 'FRAME' | 'SECTION';
export type DevStatusType = 'READY_FOR_DEV' | 'COMPLETED';
export type SetStatusType = DevStatusType;
export type FilterStatus = 'ALL' | DevStatusType;

/**
 * Plugin-tracked change state relative to the stored baseline fingerprint.
 * NO_BASELINE — no snapshot exists (status was set outside the plugin, or the
 * baseline is stale because the status changed outside the plugin).
 */
export type ChangedState = 'CHANGED' | 'UNCHANGED' | 'NO_BASELINE';
export type FilterChanged = 'ALL' | ChangedState;

export interface NodeInfo {
  id: string;
  name: string;
  type: NodeKind;
  status: DevStatusType;
  pageName: string;
  pageId: string;
  changed: ChangedState;
  baselineTs: number | null;
}

// ── UI → Plugin ──────────────────────────────────────────────────────────────
export type UiMessage =
  | { type: 'SCAN'; scope: Scope }
  | { type: 'SET_STATUS'; nodeIds: string[]; status: SetStatusType }
  | { type: 'SET_BASELINE'; nodeIds: string[] }
  | { type: 'SELECT_NODES'; nodeIds: string[] }
  | { type: 'NAVIGATE_TO_NODE'; nodeId: string; pageId: string };

// ── Plugin → UI ──────────────────────────────────────────────────────────────
export type PluginMessage =
  | { type: 'SCAN_RESULT'; nodes: NodeInfo[]; scope: Scope }
  | {
      type: 'STATUS_UPDATED';
      updates: Array<{
        nodeId: string;
        status: DevStatusType;
        changed: ChangedState;
        baselineTs: number;
      }>;
    }
  | { type: 'BASELINE_SET'; updates: Array<{ nodeId: string; baselineTs: number }> }
  | { type: 'ERROR'; message: string };
