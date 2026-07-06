import type { SetStatusType } from '../types';

interface Props {
  selectedCount: number;
  onSetStatus: (status: SetStatusType) => void;
  onSetBaseline: () => void;
  onSelectInFigma: () => void;
  onClearSelection: () => void;
}

export function BulkActions({
  selectedCount,
  onSetStatus,
  onSetBaseline,
  onSelectInFigma,
  onClearSelection,
}: Props) {
  return (
    <div class="bulk-actions">
      <span class="bulk-count">{selectedCount} selected</span>

      <button class="btn btn-outline btn-sm" onClick={() => onSetStatus('READY_FOR_DEV')}>
        → Ready for dev
      </button>

      <button class="btn btn-outline btn-sm" onClick={() => onSetStatus('COMPLETED')}>
        → Completed
      </button>

      <button
        class="btn btn-outline btn-sm"
        onClick={onSetBaseline}
        title="Record the current state of selected nodes as the reference for change tracking"
      >
        Set baseline
      </button>

      <button
        class="btn btn-ghost btn-sm"
        onClick={onSelectInFigma}
        title="Highlight selected nodes in the Figma canvas"
      >
        Select in Figma
      </button>

      <span class="bulk-spacer" />

      <button
        class="btn btn-ghost btn-sm btn-icon"
        onClick={onClearSelection}
        title="Clear selection"
      >
        ✕
      </button>
    </div>
  );
}
