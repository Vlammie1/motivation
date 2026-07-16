/** Taakstatussen en -prioriteiten, met hun labels en kleuren op één plek. */

export const TASK_STATUSES = ['todo', 'doing', 'testing', 'done'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_PRIORITIES = ['critical', 'high', 'medium', 'low'] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export interface ProjectTask {
    id: string;
    user_id: string;
    project_id: string;
    title: string;
    notes: string | null;
    status: TaskStatus;
    priority: TaskPriority;
    position: number;
    due_date: string | null;
    created_at: string;
    updated_at: string;
    completed_at: string | null;
}

export const STATUS_META: Record<TaskStatus, { label: string; color: string }> = {
    todo: { label: 'Te doen', color: '#94a3b8' },
    doing: { label: 'Bezig', color: '#3b82f6' },
    testing: { label: 'Testen', color: '#f59e0b' },
    done: { label: 'Klaar', color: '#22c55e' }
};

export const PRIORITY_META: Record<TaskPriority, { label: string; color: string }> = {
    critical: { label: 'Kritiek', color: '#ef4444' },
    high: { label: 'Hoog', color: '#f97316' },
    medium: { label: 'Middel', color: '#eab308' },
    low: { label: 'Laag', color: '#64748b' }
};

/** Aflopend op urgentie, zodat sorteren op prioriteit de juiste kant op gaat. */
export const PRIORITY_RANK: Record<TaskPriority, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3
};

export type TaskCounts = Record<TaskStatus, number> & { total: number; open: number };

export const emptyTaskCounts = (): TaskCounts => ({
    todo: 0,
    doing: 0,
    testing: 0,
    done: 0,
    total: 0,
    open: 0
});

export const countTasks = (tasks: Pick<ProjectTask, 'status'>[]): TaskCounts => {
    const counts = emptyTaskCounts();
    tasks.forEach(t => {
        counts[t.status] += 1;
        counts.total += 1;
        if (t.status !== 'done') counts.open += 1;
    });
    return counts;
};

/** Nieuwe positie voor een kaart die tussen `before` en `after` wordt gedropt.
 *  Door het midden te pakken hoeven de omliggende kaarten niet te verschuiven. */
export const positionBetween = (before: number | null, after: number | null): number => {
    if (before === null && after === null) return 0;
    if (before === null) return (after as number) - 1;
    if (after === null) return before + 1;
    return (before + after) / 2;
};
