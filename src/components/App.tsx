import { useState, useEffect, useCallback, useMemo } from 'preact/hooks';
import type {
  NodeInfo,
  PluginMessage,
  Scope,
  SetStatusType,
  FilterStatus,
  FilterChanged,
} from '../types';
import { FilterBar } from './FilterBar';
import { BulkActions } from './BulkActions';
import { NodeTable } from './NodeTable';
import { Pagination } from './Pagination';

const PAGE_SIZE = 20;

function send(msg: object) {
  parent.postMessage({ pluginMessage: msg }, '*');
}

export function App() {
  const [nodes,        setNodes]        = useState<NodeInfo[]>([]);
  const [scope,        setScope]        = useState<Scope>('current');
  const [selectedIds,  setSelectedIds]  = useState<Set<string>>(new Set());
  const [page,         setPage]         = useState(1);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('ALL');
  const [filterChanged, setFilterChanged] = useState<FilterChanged>('ALL');
  const [searchQuery,  setSearchQuery]  = useState('');
  const [loading,      setLoading]      = useState(false);
  const [hasScanned,   setHasScanned]   = useState(false);
  const [error,        setError]        = useState<string | null>(null);

  // ── Listen for plugin messages ──────────────────────────────────────────────
  useEffect(() => {
    function onMessage(event: MessageEvent) {
      const msg: PluginMessage = event.data?.pluginMessage;
      if (!msg) return;
      switch (msg.type) {
        case 'SCAN_RESULT':
          setNodes(msg.nodes);
          setSelectedIds(new Set());
          setPage(1);
          setLoading(false);
          setHasScanned(true);
          setError(null);
          break;
        case 'STATUS_UPDATED': {
          const next = new Map(msg.updates.map(u => [u.nodeId, u]));
          setNodes(prev =>
            prev.map(n => {
              const u = next.get(n.id);
              return u !== undefined
                ? { ...n, status: u.status, changed: u.changed, baselineTs: u.baselineTs }
                : n;
            }),
          );
          break;
        }
        case 'BASELINE_SET': {
          const next = new Map(msg.updates.map(u => [u.nodeId, u.baselineTs]));
          setNodes(prev =>
            prev.map(n => {
              const ts = next.get(n.id);
              return ts !== undefined
                ? { ...n, changed: 'UNCHANGED', baselineTs: ts }
                : n;
            }),
          );
          break;
        }
        case 'ERROR':
          setError(msg.message);
          setLoading(false);
          break;
      }
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  // Auto-scan current page on mount
  useEffect(() => { triggerScan('current'); }, []);

  // ── Actions ─────────────────────────────────────────────────────────────────
  const triggerScan = useCallback((newScope: Scope) => {
    setScope(newScope);
    setLoading(true);
    setError(null);
    send({ type: 'SCAN', scope: newScope });
  }, []);

  const handleSetStatus = useCallback((nodeIds: string[], status: SetStatusType) => {
    send({ type: 'SET_STATUS', nodeIds, status });
  }, []);

  const handleSetBaseline = useCallback((nodeIds: string[]) => {
    send({ type: 'SET_BASELINE', nodeIds });
  }, []);

  const handleNavigate = useCallback((nodeId: string, pageId: string) => {
    send({ type: 'NAVIGATE_TO_NODE', nodeId, pageId });
  }, []);

  const handleSelectInFigma = useCallback((nodeIds: string[]) => {
    send({ type: 'SELECT_NODES', nodeIds });
  }, []);

  // ── Derived data ─────────────────────────────────────────────────────────────
  const filteredNodes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return nodes.filter(n => {
      const matchStatus = filterStatus === 'ALL' || n.status === filterStatus;
      const matchChanged = filterChanged === 'ALL' || n.changed === filterChanged;
      const matchSearch =
        !q ||
        n.name.toLowerCase().includes(q) ||
        n.pageName.toLowerCase().includes(q);
      return matchStatus && matchChanged && matchSearch;
    });
  }, [nodes, filterStatus, filterChanged, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredNodes.length / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages);
  const pageStart  = (safePage - 1) * PAGE_SIZE;
  const pagedNodes = filteredNodes.slice(pageStart, pageStart + PAGE_SIZE);

  const pageIds         = pagedNodes.map(n => n.id);
  const selOnPageCount  = pageIds.filter(id => selectedIds.has(id)).length;
  const allSelected     = pagedNodes.length > 0 && selOnPageCount === pagedNodes.length;
  const someSelected    = selOnPageCount > 0 && selOnPageCount < pagedNodes.length;

  const toggleIds = useCallback((ids: string[], checked: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      ids.forEach(id => (checked ? next.add(id) : next.delete(id)));
      return next;
    });
  }, []);

  const handleSelectAll = useCallback((checked: boolean) => toggleIds(pageIds, checked), [toggleIds, pageIds]);
  const handleSelectRow = useCallback((id: string, checked: boolean) => toggleIds([id], checked), [toggleIds]);

  const selectedArray = useMemo(() => Array.from(selectedIds), [selectedIds]);

  /** "All →" operates on the full filtered set (respects search + status filter). */
  const setAllStatus = useCallback((status: SetStatusType) => {
    handleSetStatus(filteredNodes.map(n => n.id), status);
  }, [filteredNodes, handleSetStatus]);

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div class="app">
      <FilterBar
        scope={scope}
        filterStatus={filterStatus}
        filterChanged={filterChanged}
        searchQuery={searchQuery}
        loading={loading}
        onScopeChange={triggerScan}
        onFilterStatusChange={(s) => { setFilterStatus(s); setPage(1); }}
        onFilterChangedChange={(c) => { setFilterChanged(c); setPage(1); }}
        onSearchChange={(q) => { setSearchQuery(q); setPage(1); }}
      />

      {selectedArray.length > 0 && (
        <BulkActions
          selectedCount={selectedArray.length}
          onSetStatus={(status) => handleSetStatus(selectedArray, status)}
          onSetBaseline={() => handleSetBaseline(selectedArray)}
          onSelectInFigma={() => handleSelectInFigma(selectedArray)}
          onClearSelection={() => setSelectedIds(new Set())}
        />
      )}

      <div class="table-wrap">
        {error && (
          <div class="error-banner">
            <span>⚠</span>
            {error}
          </div>
        )}

        {!hasScanned && !loading && (
          <div class="state-center">
            <p class="state-title">Ready to scan</p>
            <p class="state-desc">
              Choose a scope above and click <strong>Rescan</strong> to list
              Frames and Sections with their dev statuses.
            </p>
          </div>
        )}

        {hasScanned && !loading && filteredNodes.length === 0 && (
          <div class="state-center">
            <p class="state-title">No results</p>
            <p class="state-desc">
              No Frames or Sections match the current filters.
            </p>
          </div>
        )}

        <NodeTable
          nodes={pagedNodes}
          selectedIds={selectedIds}
          allSelected={allSelected}
          indeterminate={someSelected}
          loading={loading}
          onSelectAll={handleSelectAll}
          onSelectRow={handleSelectRow}
          onNavigate={handleNavigate}
          onSetStatus={(nodeId, status) => handleSetStatus([nodeId], status)}
          onSetBaseline={(nodeId) => handleSetBaseline([nodeId])}
        />
      </div>

      {hasScanned && !loading && (
        <div class="footer">
          <span class="footer-stats">
            {filteredNodes.length > 0
              ? `${pageStart + 1}–${Math.min(pageStart + PAGE_SIZE, filteredNodes.length)} of ${filteredNodes.length}`
              : '0 results'}
            {selectedIds.size > 0 && (
              <span class="footer-selected"> · {selectedIds.size} selected</span>
            )}
          </span>

          <span class="footer-spacer" />

          <button
            class="btn btn-outline btn-sm"
            disabled={filteredNodes.length === 0}
            onClick={() => setAllStatus('READY_FOR_DEV')}
            title={`Set all ${filteredNodes.length} visible nodes to Ready for dev`}
          >
            All → Ready for dev
          </button>
          <button
            class="btn btn-outline btn-sm"
            disabled={filteredNodes.length === 0}
            onClick={() => setAllStatus('COMPLETED')}
            title={`Set all ${filteredNodes.length} visible nodes to Completed`}
          >
            All → Completed
          </button>

          <Pagination
            currentPage={safePage}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div>
      )}

      <div class="limitation-notice">
        <span>ℹ</span>
        <span>
          Figma's native "changed" indicator isn't exposed to plugins, so the{' '}
          <strong>Changes</strong> column tracks this plugin's own baseline: setting a
          status here (or clicking <strong>Set baseline</strong>) records a snapshot,
          and each <strong>Rescan</strong> compares against it. Statuses set outside
          the plugin show as <strong>No baseline</strong>.
        </span>
      </div>
    </div>
  );
}
