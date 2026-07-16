import { useState } from 'react';
import { ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { PRIORITY_RANK, STATUS_META, TASK_STATUSES } from '../../lib/tasks';
import type { ProjectTask, TaskPriority, TaskStatus } from '../../lib/tasks';
import { PrioritySelect, StatusSelect } from './TaskChips';

interface TaskListViewProps {
    tasks: ProjectTask[];
    onAdd: (title: string, status: TaskStatus) => Promise<unknown>;
    onUpdate: (id: string, updates: Partial<ProjectTask>) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
}

const rowStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) auto auto auto',
    alignItems: 'center',
    gap: 'var(--spacing-sm)',
    padding: 'var(--spacing-xs) var(--spacing-sm)',
    borderTop: '1px solid var(--color-border)'
};

const TaskRow = ({ task, onUpdate, onDelete }: {
    task: ProjectTask;
    onUpdate: TaskListViewProps['onUpdate'];
    onDelete: TaskListViewProps['onDelete'];
}) => {
    const [title, setTitle] = useState(task.title);

    const commitTitle = () => {
        const next = title.trim();
        if (!next) {
            setTitle(task.title);
            return;
        }
        if (next !== task.title) onUpdate(task.id, { title: next });
    };

    return (
        <div style={rowStyle}>
            <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                onBlur={commitTitle}
                onKeyDown={e => {
                    if (e.key === 'Enter') e.currentTarget.blur();
                    if (e.key === 'Escape') { setTitle(task.title); e.currentTarget.blur(); }
                }}
                aria-label="Taaktitel"
                style={{
                    background: 'transparent',
                    border: '1px solid transparent',
                    borderRadius: 'var(--radius-sm)',
                    padding: 'var(--spacing-2xs)',
                    color: 'var(--color-text)',
                    fontSize: 'var(--text-sm)',
                    width: '100%',
                    textDecoration: task.status === 'done' ? 'line-through' : 'none',
                    opacity: task.status === 'done' ? 0.6 : 1
                }}
            />
            <StatusSelect value={task.status} onChange={status => onUpdate(task.id, { status })} />
            <PrioritySelect value={task.priority} onChange={priority => onUpdate(task.id, { priority })} />
            <button
                onClick={() => onDelete(task.id)}
                title="Taak verwijderen"
                style={{
                    display: 'flex', alignItems: 'center', padding: 'var(--spacing-2xs)',
                    background: 'transparent', border: '1px solid transparent',
                    color: 'var(--color-text-muted)', cursor: 'pointer'
                }}
            >
                <Trash2 size={14} />
            </button>
        </div>
    );
};

const StatusGroup = ({ status, tasks, onAdd, onUpdate, onDelete }: {
    status: TaskStatus;
    tasks: ProjectTask[];
} & Pick<TaskListViewProps, 'onAdd' | 'onUpdate' | 'onDelete'>) => {
    const [open, setOpen] = useState(true);
    const [adding, setAdding] = useState(false);
    const [draft, setDraft] = useState('');
    const meta = STATUS_META[status];

    const submit = async () => {
        const title = draft.trim();
        if (!title) { setAdding(false); return; }
        await onAdd(title, status);
        setDraft('');
    };

    return (
        <section style={{ marginBottom: 'var(--spacing-lg)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                <button
                    onClick={() => setOpen(v => !v)}
                    aria-expanded={open}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 'var(--spacing-2xs)',
                        background: 'transparent', border: 'none', padding: 'var(--spacing-2xs)',
                        color: 'var(--color-text)', cursor: 'pointer'
                    }}
                >
                    {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    <span style={{ color: meta.color, fontWeight: 700, fontSize: 'var(--text-sm)' }}>
                        {meta.label}
                    </span>
                    <span className="muted" style={{ fontSize: 'var(--text-sm)' }}>{tasks.length}</span>
                </button>
                <button
                    onClick={() => setAdding(true)}
                    title={`Taak toevoegen aan ${meta.label}`}
                    style={{
                        display: 'flex', alignItems: 'center', padding: 'var(--spacing-2xs)',
                        background: 'transparent', border: '1px solid transparent',
                        color: 'var(--color-text-muted)', cursor: 'pointer'
                    }}
                >
                    <Plus size={14} />
                </button>
            </div>

            {open && (
                <div style={{
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    marginTop: 'var(--spacing-2xs)',
                    overflow: 'hidden'
                }}>
                    {tasks.length === 0 && !adding && (
                        <div className="muted" style={{ padding: 'var(--spacing-sm)', fontSize: 'var(--text-sm)' }}>
                            Geen taken.
                        </div>
                    )}
                    {tasks.map(task => (
                        <TaskRow key={task.id} task={task} onUpdate={onUpdate} onDelete={onDelete} />
                    ))}
                    {adding && (
                        <div style={{ ...rowStyle, gridTemplateColumns: '1fr' }}>
                            <input
                                autoFocus
                                value={draft}
                                onChange={e => setDraft(e.target.value)}
                                onBlur={() => { submit(); setAdding(false); }}
                                onKeyDown={e => {
                                    if (e.key === 'Enter') submit();
                                    if (e.key === 'Escape') { setDraft(''); setAdding(false); }
                                }}
                                placeholder="Nieuwe taak… (Enter om toe te voegen)"
                                style={{
                                    background: 'transparent', border: '1px solid transparent',
                                    padding: 'var(--spacing-2xs)', color: 'var(--color-text)',
                                    fontSize: 'var(--text-sm)', width: '100%'
                                }}
                            />
                        </div>
                    )}
                </div>
            )}
        </section>
    );
};

export const TaskListView = ({ tasks, onAdd, onUpdate, onDelete }: TaskListViewProps) => (
    <div>
        {TASK_STATUSES.map(status => (
            <StatusGroup
                key={status}
                status={status}
                tasks={tasks
                    .filter(t => t.status === status)
                    .sort((a, b) => PRIORITY_RANK[a.priority as TaskPriority] - PRIORITY_RANK[b.priority as TaskPriority]
                        || a.position - b.position)}
                onAdd={onAdd}
                onUpdate={onUpdate}
                onDelete={onDelete}
            />
        ))}
    </div>
);
