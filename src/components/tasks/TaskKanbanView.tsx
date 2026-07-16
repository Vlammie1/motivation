import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { STATUS_META, TASK_STATUSES, positionBetween } from '../../lib/tasks';
import type { ProjectTask, TaskStatus } from '../../lib/tasks';
import { PriorityChip } from './TaskChips';

interface TaskKanbanViewProps {
    tasks: ProjectTask[];
    onAdd: (title: string, status: TaskStatus) => Promise<unknown>;
    onUpdate: (id: string, updates: Partial<ProjectTask>) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
}

/** Waar een gesleepte kaart terechtkomt: vóór een specifieke kaart, of
 *  onderaan een kolom. */
type DropTarget = { status: TaskStatus; beforeId: string | null };

// Puur op positie: sleep je een kaart ergens heen, dan hoort hij daar te
// blijven liggen. Zou prioriteit hier meewegen, dan sprong een kaart tussen
// twee kaarten van een andere prioriteit meteen terug.
const sortColumn = (a: ProjectTask, b: ProjectTask) =>
    a.position - b.position || a.created_at.localeCompare(b.created_at);

export const TaskKanbanView = ({ tasks, onAdd, onUpdate, onDelete }: TaskKanbanViewProps) => {
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
    const [addingTo, setAddingTo] = useState<TaskStatus | null>(null);
    const [draft, setDraft] = useState('');

    const columns = TASK_STATUSES.map(status => ({
        status,
        items: tasks.filter(t => t.status === status).sort(sortColumn)
    }));

    const handleDrop = async (target: DropTarget) => {
        const id = draggingId;
        setDraggingId(null);
        setDropTarget(null);
        if (!id) return;

        const task = tasks.find(t => t.id === id);
        if (!task) return;

        const column = tasks.filter(t => t.status === target.status && t.id !== id).sort(sortColumn);
        const index = target.beforeId ? column.findIndex(t => t.id === target.beforeId) : column.length;
        const at = index === -1 ? column.length : index;

        const before = at > 0 ? column[at - 1].position : null;
        const after = at < column.length ? column[at].position : null;
        const position = positionBetween(before, after);

        if (task.status === target.status && task.position === position) return;
        await onUpdate(id, { status: target.status, position });
    };

    const submitDraft = async (status: TaskStatus) => {
        const title = draft.trim();
        if (!title) { setAddingTo(null); return; }
        await onAdd(title, status);
        setDraft('');
    };

    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${TASK_STATUSES.length}, minmax(200px, 1fr))`,
            gap: 'var(--spacing-md)',
            overflowX: 'auto',
            alignItems: 'start'
        }}>
            {columns.map(({ status, items }) => {
                const meta = STATUS_META[status];
                const isColumnTarget = dropTarget?.status === status && dropTarget.beforeId === null;

                return (
                    <div
                        key={status}
                        onDragOver={e => {
                            e.preventDefault();
                            e.dataTransfer.dropEffect = 'move';
                            setDropTarget({ status, beforeId: null });
                        }}
                        onDrop={e => { e.preventDefault(); handleDrop({ status, beforeId: null }); }}
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 'var(--spacing-xs)',
                            padding: 'var(--spacing-xs)',
                            borderRadius: 'var(--radius-md)',
                            border: `1px solid ${isColumnTarget ? meta.color : 'var(--color-border)'}`,
                            background: 'var(--color-surface-2)',
                            minHeight: '120px'
                        }}
                    >
                        <div style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            gap: 'var(--spacing-xs)', padding: 'var(--spacing-2xs)'
                        }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2xs)' }}>
                                <span style={{ color: meta.color, fontWeight: 700, fontSize: 'var(--text-sm)' }}>
                                    {meta.label}
                                </span>
                                <span className="muted" style={{ fontSize: 'var(--text-sm)' }}>{items.length}</span>
                            </span>
                            <button
                                onClick={() => { setAddingTo(status); setDraft(''); }}
                                title={`Taak toevoegen aan ${meta.label}`}
                                style={{
                                    display: 'flex', alignItems: 'center', padding: '2px',
                                    background: 'transparent', border: '1px solid transparent',
                                    color: 'var(--color-text-muted)', cursor: 'pointer'
                                }}
                            >
                                <Plus size={14} />
                            </button>
                        </div>

                        {addingTo === status && (
                            <input
                                autoFocus
                                value={draft}
                                onChange={e => setDraft(e.target.value)}
                                onBlur={() => { submitDraft(status); setAddingTo(null); }}
                                onKeyDown={e => {
                                    if (e.key === 'Enter') submitDraft(status);
                                    if (e.key === 'Escape') { setDraft(''); setAddingTo(null); }
                                }}
                                placeholder="Nieuwe taak…"
                                style={{
                                    width: '100%', boxSizing: 'border-box',
                                    background: 'var(--color-bg)', color: 'var(--color-text)',
                                    border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)',
                                    padding: 'var(--spacing-xs)', fontSize: 'var(--text-sm)'
                                }}
                            />
                        )}

                        {items.map(task => {
                            const isTarget = dropTarget?.status === status && dropTarget.beforeId === task.id;
                            return (
                                <div
                                    key={task.id}
                                    draggable
                                    onDragStart={e => {
                                        setDraggingId(task.id);
                                        e.dataTransfer.effectAllowed = 'move';
                                        // Firefox start pas een drag als er data gezet is.
                                        e.dataTransfer.setData('text/plain', task.id);
                                    }}
                                    onDragEnd={() => { setDraggingId(null); setDropTarget(null); }}
                                    onDragOver={e => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setDropTarget({ status, beforeId: task.id });
                                    }}
                                    onDrop={e => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleDrop({ status, beforeId: task.id });
                                    }}
                                    style={{
                                        background: 'var(--color-bg)',
                                        border: '1px solid var(--color-border)',
                                        borderTop: isTarget ? `2px solid ${meta.color}` : '1px solid var(--color-border)',
                                        borderLeft: `3px solid ${meta.color}`,
                                        borderRadius: 'var(--radius-sm)',
                                        padding: 'var(--spacing-xs)',
                                        cursor: 'grab',
                                        opacity: draggingId === task.id ? 0.4 : 1,
                                        display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2xs)'
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--spacing-2xs)' }}>
                                        <span style={{
                                            fontSize: 'var(--text-sm)', lineHeight: 1.35, wordBreak: 'break-word',
                                            textDecoration: task.status === 'done' ? 'line-through' : 'none',
                                            opacity: task.status === 'done' ? 0.6 : 1
                                        }}>
                                            {task.title}
                                        </span>
                                        <button
                                            onClick={() => onDelete(task.id)}
                                            title="Taak verwijderen"
                                            style={{
                                                display: 'flex', alignItems: 'flex-start', padding: 0, flexShrink: 0,
                                                background: 'transparent', border: 'none',
                                                color: 'var(--color-text-muted)', cursor: 'pointer'
                                            }}
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                    <PriorityChip priority={task.priority} />
                                </div>
                            );
                        })}
                    </div>
                );
            })}
        </div>
    );
};
