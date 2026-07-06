import type { DevStatusType } from '../types';

interface Props {
  status: DevStatusType;
}

const LABEL: Record<DevStatusType, string> = {
  READY_FOR_DEV: 'Ready for dev',
  COMPLETED:     'Completed',
};

const CLASS: Record<DevStatusType, string> = {
  READY_FOR_DEV: 'badge badge-ready',
  COMPLETED:     'badge badge-done',
};

export function StatusBadge({ status }: Props) {
  return (
    <span class={CLASS[status]}>
      <span class="badge-dot" />
      {LABEL[status]}
    </span>
  );
}
