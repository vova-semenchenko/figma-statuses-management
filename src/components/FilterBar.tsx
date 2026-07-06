import type { Scope, FilterStatus } from '../types';

interface Props {
  scope: Scope;
  filterStatus: FilterStatus;
  searchQuery: string;
  loading: boolean;
  onScopeChange: (scope: Scope) => void;
  onFilterStatusChange: (status: FilterStatus) => void;
  onSearchChange: (query: string) => void;
}

export function FilterBar({
  scope,
  filterStatus,
  searchQuery,
  loading,
  onScopeChange,
  onFilterStatusChange,
  onSearchChange,
}: Props) {
  return (
    <div class="filter-bar">
      {/* Scope toggle */}
      <div class="scope-group">
        <button
          class={`scope-btn ${scope === 'current' ? 'active' : ''}`}
          onClick={() => onScopeChange('current')}
          disabled={loading}
        >
          Current page
        </button>
        <button
          class={`scope-btn ${scope === 'all' ? 'active' : ''}`}
          onClick={() => onScopeChange('all')}
          disabled={loading}
        >
          All pages
        </button>
      </div>

      {/* Search */}
      <input
        type="text"
        class="search-input"
        placeholder="Search name or page…"
        value={searchQuery}
        onInput={(e) => onSearchChange((e.target as HTMLInputElement).value)}
      />

      {/* Status filter */}
      <select
        class="filter-select"
        value={filterStatus}
        onChange={(e) =>
          onFilterStatusChange((e.target as HTMLSelectElement).value as FilterStatus)
        }
      >
        <option value="ALL">All statuses</option>
        <option value="READY_FOR_DEV">Ready for dev</option>
        <option value="COMPLETED">Completed</option>
      </select>

      {/* Rescan */}
      <button
        class="scan-btn"
        onClick={() => onScopeChange(scope)}
        disabled={loading}
      >
        {loading ? 'Scanning…' : 'Rescan'}
      </button>
    </div>
  );
}
