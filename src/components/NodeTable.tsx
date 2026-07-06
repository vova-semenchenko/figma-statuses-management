import { useRef, useEffect } from 'preact/hooks';
import type { NodeInfo, SetStatusType } from '../types';
import { StatusBadge } from './StatusBadge';

interface Props {
  nodes: NodeInfo[];
  selectedIds: Set<string>;
  allSelected: boolean;
  indeterminate: boolean;
  loading: boolean;
  onSelectAll: (checked: boolean) => void;
  onSelectRow: (id: string, checked: boolean) => void;
  onNavigate: (nodeId: string, pageId: string) => void;
  onSetStatus: (nodeId: string, status: SetStatusType) => void;
}

/** Checkbox that supports the indeterminate visual state via a ref. */
function HeaderCheckbox({
  checked,
  indeterminate,
  onChange,
}: {
  checked: boolean;
  indeterminate: boolean;
  onChange: (checked: boolean) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);

  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange((e.target as HTMLInputElement).checked)}
    />
  );
}

// ── Icons ─────────────────────────────────────────────────────────────────────

const FrameIcon = () => (
  <svg width="11" height="11" viewBox="0 0 11 11" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="0.5" y="0.5" width="10" height="10" rx="1.5" stroke="currentColor" />
    <line x1="3" y1="0" x2="3" y2="11" stroke="currentColor" strokeWidth="0.8" />
    <line x1="8" y1="0" x2="8" y2="11" stroke="currentColor" strokeWidth="0.8" />
    <line x1="0" y1="3" x2="11" y2="3" stroke="currentColor" strokeWidth="0.8" />
    <line x1="0" y1="8" x2="11" y2="8" stroke="currentColor" strokeWidth="0.8" />
  </svg>
);

const SectionIcon = () => (
  <svg width="11" height="11" viewBox="0 0 11 11" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect
      x="0.5" y="0.5" width="10" height="10" rx="1.5"
      stroke="currentColor" strokeDasharray="2 1.5"
    />
  </svg>
);

// ── NodeTable ─────────────────────────────────────────────────────────────────

export function NodeTable({
  nodes,
  selectedIds,
  allSelected,
  indeterminate,
  loading,
  onSelectAll,
  onSelectRow,
  onNavigate,
  onSetStatus,
}: Props) {
  if (loading) {
    return (
      <div class="state-center">
        <div class="spinner" />
        <p class="state-desc">Scanning nodes…</p>
      </div>
    );
  }

  if (nodes.length === 0) return null;

  return (
    <div class="table-container">
      <table>
        <colgroup>
          <col class="col-cb" />
          <col class="col-name" />
          <col class="col-type" />
          <col class="col-status" />
          <col class="col-page" />
          <col class="col-action" />
        </colgroup>
        <thead>
          <tr>
            <th class="col-cb">
              <HeaderCheckbox
                checked={allSelected}
                indeterminate={indeterminate}
                onChange={onSelectAll}
              />
            </th>
            <th class="col-name">Name</th>
            <th class="col-type">Type</th>
            <th class="col-status">Status</th>
            <th class="col-page">Page</th>
            <th class="col-action">Actions</th>
          </tr>
        </thead>
        <tbody>
          {nodes.map((node) => (
            <NodeRow
              key={node.id}
              node={node}
              selected={selectedIds.has(node.id)}
              onSelect={(checked) => onSelectRow(node.id, checked)}
              onNavigate={() => onNavigate(node.id, node.pageId)}
              onSetStatus={(status) => onSetStatus(node.id, status)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── NodeRow ───────────────────────────────────────────────────────────────────

interface RowProps {
  node: NodeInfo;
  selected: boolean;
  onSelect: (checked: boolean) => void;
  onNavigate: () => void;
  onSetStatus: (status: SetStatusType) => void;
}

function NodeRow({ node, selected, onSelect, onNavigate, onSetStatus }: RowProps) {
  return (
    <tr>
      {/* Checkbox */}
      <td class="col-cb">
        <input
          type="checkbox"
          checked={selected}
          onChange={(e) => onSelect((e.target as HTMLInputElement).checked)}
        />
      </td>

      {/* Name */}
      <td class="col-name">
        <div class="cell-name">
          <span class="node-icon">
            {node.type === 'FRAME' ? <FrameIcon /> : <SectionIcon />}
          </span>
          <span class="node-name" title={node.name}>{node.name}</span>
        </div>
      </td>

      {/* Type */}
      <td class="col-type">
        <span class="type-chip">{node.type === 'FRAME' ? 'Frame' : 'Section'}</span>
      </td>

      {/* Status */}
      <td class="col-status">
        <StatusBadge status={node.status} />
      </td>

      {/* Page */}
      <td class="col-page">
        <span class="cell-page" title={node.pageName}>{node.pageName}</span>
      </td>

      {/* Actions */}
      <td class="col-action">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '2px' }}>
          {/* Navigate — always visible */}
          <button
            class="btn btn-ghost btn-sm btn-icon"
            onClick={onNavigate}
            title="Go to node in canvas"
          >
            ↗
          </button>
          {/* Quick-set — visible on row hover via CSS */}
          <span class="row-hover-actions">
            <button
              class="btn btn-ghost btn-sm"
              style={{ fontSize: '10px', padding: '2px 5px' }}
              onClick={() => onSetStatus('READY_FOR_DEV')}
              title="Set Ready for dev"
            >
              R
            </button>
            <button
              class="btn btn-ghost btn-sm"
              style={{ fontSize: '10px', padding: '2px 5px' }}
              onClick={() => onSetStatus('COMPLETED')}
              title="Set Completed"
            >
              C
            </button>
          </span>
        </div>
      </td>
    </tr>
  );
}
