import type { ChangedState } from '../types';

interface Props {
  changed: ChangedState;
  baselineTs: number | null;
}

const LABEL: Record<ChangedState, string> = {
  CHANGED:     'Changed',
  UNCHANGED:   'In sync',
  NO_BASELINE: 'No baseline',
};

const CLASS: Record<ChangedState, string> = {
  CHANGED:     'badge badge-changed',
  UNCHANGED:   'badge badge-insync',
  NO_BASELINE: 'badge badge-nobaseline',
};

function formatTs(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function title(changed: ChangedState, baselineTs: number | null): string {
  if (changed === 'NO_BASELINE' || baselineTs === null) {
    return 'No reference snapshot. Set the status via this plugin or click Set baseline to start tracking changes.';
  }
  const since = `Baseline set ${formatTs(baselineTs)}`;
  return changed === 'CHANGED'
    ? `${since} — content changed since then.`
    : `${since} — no changes since then.`;
}

export function ChangedBadge({ changed, baselineTs }: Props) {
  return (
    <span class={CLASS[changed]} title={title(changed, baselineTs)}>
      <span class="badge-dot" />
      {LABEL[changed]}
    </span>
  );
}
