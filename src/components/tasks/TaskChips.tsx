import { PRIORITY_META, STATUS_META, TASK_PRIORITIES, TASK_STATUSES } from '../../lib/tasks';
import type { TaskPriority, TaskStatus } from '../../lib/tasks';
import { ChipSelect } from './ChipSelect';

const chipStyle = (color: string): React.CSSProperties => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '1px var(--spacing-2xs)',
    borderRadius: 'var(--radius-sm)',
    // Een doorschijnende vulling van de statuskleur blijft in alle vier de
    // thema's leesbaar, anders dan een vaste achtergrond.
    background: `color-mix(in srgb, ${color} 18%, transparent)`,
    color,
    border: `1px solid color-mix(in srgb, ${color} 40%, transparent)`,
    fontSize: 'var(--text-xs)',
    fontWeight: 600,
    whiteSpace: 'nowrap'
});

export const StatusChip = ({ status }: { status: TaskStatus }) => {
    const meta = STATUS_META[status];
    return <span style={chipStyle(meta.color)}>{meta.label}</span>;
};

export const PriorityChip = ({ priority }: { priority: TaskPriority }) => {
    const meta = PRIORITY_META[priority];
    return <span style={chipStyle(meta.color)}>{meta.label}</span>;
};

const STATUS_OPTIONS = TASK_STATUSES.map(s => ({ value: s, ...STATUS_META[s] }));
const PRIORITY_OPTIONS = TASK_PRIORITIES.map(p => ({ value: p, ...PRIORITY_META[p] }));

export const StatusSelect = ({ value, onChange }: { value: TaskStatus; onChange: (s: TaskStatus) => void }) => (
    <ChipSelect value={value} options={STATUS_OPTIONS} onChange={onChange} ariaLabel="Status" />
);

export const PrioritySelect = ({ value, onChange }: { value: TaskPriority; onChange: (p: TaskPriority) => void }) => (
    <ChipSelect value={value} options={PRIORITY_OPTIONS} onChange={onChange} ariaLabel="Prioriteit" />
);
