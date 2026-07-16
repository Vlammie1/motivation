import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { bumpWorkDataEpoch } from '../lib/cache';
import type { ProjectTask, TaskPriority, TaskStatus } from '../lib/tasks';

const byPosition = (a: ProjectTask, b: ProjectTask) =>
    a.position - b.position || a.created_at.localeCompare(b.created_at);

/** Alle taken van één project. Mutaties werken de lijst lokaal bij en zetten
 *  hem pas terug als Supabase de schrijfactie afkeurt. */
export const useSupabaseTasks = (projectId: string | undefined) => {
    const { user } = useAuth();
    const [tasks, setTasks] = useState<ProjectTask[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchTasks = useCallback(async () => {
        if (!user || !projectId) {
            setTasks([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        const { data, error } = await supabase
            .from('project_tasks')
            .select('*')
            .eq('user_id', user.id)
            .eq('project_id', projectId)
            .order('position', { ascending: true });

        if (error) {
            console.error('Error fetching tasks:', error);
        } else {
            setTasks((data || []) as ProjectTask[]);
        }
        setLoading(false);
    }, [user?.id, projectId]);

    useEffect(() => {
        fetchTasks();
    }, [fetchTasks]);

    const addTask = useCallback(async (
        title: string,
        status: TaskStatus = 'todo',
        priority: TaskPriority = 'medium'
    ): Promise<ProjectTask | null> => {
        if (!user || !projectId) return null;

        // Bovenaan in de kolom: oplopend gesorteerd, dus lager dan de laagste.
        const lowest = tasks
            .filter(t => t.status === status)
            .reduce((min, t) => Math.min(min, t.position), 0);

        const { data, error } = await supabase
            .from('project_tasks')
            .insert({
                user_id: user.id,
                project_id: projectId,
                title: title.trim(),
                status,
                priority,
                position: lowest - 1,
                completed_at: status === 'done' ? new Date().toISOString() : null
            })
            .select()
            .single();

        if (error) {
            console.error('Error adding task:', error);
            alert('Taak toevoegen mislukt: ' + error.message);
            return null;
        }

        bumpWorkDataEpoch();
        setTasks(prev => [...prev, data as ProjectTask].sort(byPosition));
        return data as ProjectTask;
    }, [user?.id, projectId, tasks]);

    const updateTask = useCallback(async (
        taskId: string,
        updates: Partial<Pick<ProjectTask, 'title' | 'notes' | 'status' | 'priority' | 'position' | 'due_date'>>
    ) => {
        if (!user) return;

        // Klaar-zetten legt vast wanneer; terugzetten wist dat weer.
        const patch: Record<string, unknown> = { ...updates, updated_at: new Date().toISOString() };
        if (updates.status !== undefined) {
            patch.completed_at = updates.status === 'done' ? new Date().toISOString() : null;
        }

        let previous: ProjectTask[] = [];
        setTasks(prev => {
            previous = prev;
            return prev.map(t => (t.id === taskId ? { ...t, ...patch } as ProjectTask : t)).sort(byPosition);
        });
        bumpWorkDataEpoch();

        const { error } = await supabase
            .from('project_tasks')
            .update(patch)
            .eq('id', taskId)
            .eq('user_id', user.id);

        if (error) {
            console.error('Error updating task:', error);
            alert('Taak bijwerken mislukt: ' + error.message);
            setTasks(previous);
            bumpWorkDataEpoch();
        }
    }, [user?.id]);

    const deleteTask = useCallback(async (taskId: string) => {
        if (!user) return;

        let previous: ProjectTask[] = [];
        setTasks(prev => {
            previous = prev;
            return prev.filter(t => t.id !== taskId);
        });
        bumpWorkDataEpoch();

        const { error } = await supabase
            .from('project_tasks')
            .delete()
            .eq('id', taskId)
            .eq('user_id', user.id);

        if (error) {
            console.error('Error deleting task:', error);
            alert('Taak verwijderen mislukt: ' + error.message);
            setTasks(previous);
            bumpWorkDataEpoch();
        }
    }, [user?.id]);

    return { tasks, loading, addTask, updateTask, deleteTask, refresh: fetchTasks };
};
