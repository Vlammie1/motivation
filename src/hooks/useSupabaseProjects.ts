import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { DEFAULT_PROJECT_COLOR } from '../lib/projectColors';
import { localDateKey } from '../lib/time';

export interface Project {
    id: string;
    user_id: string;
    name: string;
    color: string;
    archived: boolean;
    created_at: string;
}

export interface ProjectWithHours extends Project {
    total_hours: number;
}

export interface ProjectStats extends ProjectWithHours {
    sessions: number;
    hours_last_7: number;
    hours_last_30: number;
    avg_session: number;
    last_worked: string | null;
}

export const useSupabaseProjects = () => {
    const { user } = useAuth();
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchProjects = useCallback(async () => {
        if (!user) {
            setLoading(false);
            setProjects([]);
            return;
        }

        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('projects')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: true });

            if (error) {
                console.error('Error fetching projects:', error);
                setProjects([]);
            } else {
                setProjects(data || []);
            }
        } catch (err) {
            console.error('Unexpected error fetching projects:', err);
            setProjects([]);
        } finally {
            setLoading(false);
        }
    }, [user?.id]);

    useEffect(() => {
        fetchProjects();
    }, [fetchProjects]);

    const addProject = async (name: string, color: string = DEFAULT_PROJECT_COLOR): Promise<Project | null> => {
        if (!user) return null;

        const { data, error } = await supabase
            .from('projects')
            .insert({ user_id: user.id, name, color })
            .select()
            .single();

        if (error) {
            console.error('Error adding project:', error);
            alert('Project toevoegen mislukt: ' + error.message);
            return null;
        }

        setProjects(prev => [...prev, data]);
        return data;
    };

    const deleteProject = async (projectId: string) => {
        if (!user) return;

        const { error } = await supabase
            .from('projects')
            .delete()
            .eq('id', projectId)
            .eq('user_id', user.id);

        if (error) {
            console.error('Error deleting project:', error);
            alert('Project verwijderen mislukt: ' + error.message);
            return;
        }

        setProjects(prev => prev.filter(p => p.id !== projectId));
    };

    const updateProject = async (projectId: string, updates: { name?: string; color?: string; archived?: boolean }) => {
        if (!user) return;

        const previous = projects;
        setProjects(prev => prev.map(p => (p.id === projectId ? { ...p, ...updates } : p)));

        const { error } = await supabase
            .from('projects')
            .update(updates)
            .eq('id', projectId)
            .eq('user_id', user.id);

        if (error) {
            console.error('Error updating project:', error);
            alert('Project bijwerken mislukt: ' + error.message);
            setProjects(previous);
        }
    };

    /** Alle projecten met afgeleide statistieken, gesorteerd op totale uren. */
    const getProjectStats = useCallback(async (): Promise<ProjectStats[]> => {
        if (!user) return [];

        const [{ data: projectsData, error: projectsError }, { data: entriesData, error: entriesError }] =
            await Promise.all([
                supabase.from('projects').select('*').eq('user_id', user.id),
                supabase
                    .from('work_log_entries')
                    .select('project_id, hours, work_date')
                    .eq('user_id', user.id)
                    .not('project_id', 'is', null)
            ]);

        if (projectsError || !projectsData) {
            console.error('Error fetching projects for stats:', projectsError);
            return [];
        }
        if (entriesError) {
            console.error('Error fetching entries for stats:', entriesError);
        }

        const today = new Date();
        const cutoff = (days: number) => localDateKey(new Date(today.getTime() - days * 86400000));
        const cutoff7 = cutoff(7);
        const cutoff30 = cutoff(30);

        const acc: Record<string, { total: number; sessions: number; last7: number; last30: number; last: string | null }> = {};
        (entriesData || []).forEach(entry => {
            const id = entry.project_id as string | null;
            if (!id) return;
            const hours = Number(entry.hours);
            const bucket = acc[id] || (acc[id] = { total: 0, sessions: 0, last7: 0, last30: 0, last: null });
            bucket.total += hours;
            bucket.sessions += 1;
            if (entry.work_date >= cutoff7) bucket.last7 += hours;
            if (entry.work_date >= cutoff30) bucket.last30 += hours;
            if (!bucket.last || entry.work_date > bucket.last) bucket.last = entry.work_date;
        });

        return projectsData
            .map(p => {
                const b = acc[p.id];
                return {
                    ...p,
                    total_hours: b?.total || 0,
                    sessions: b?.sessions || 0,
                    hours_last_7: b?.last7 || 0,
                    hours_last_30: b?.last30 || 0,
                    avg_session: b && b.sessions > 0 ? b.total / b.sessions : 0,
                    last_worked: b?.last || null
                };
            })
            .sort((a, b) => b.total_hours - a.total_hours);
    }, [user?.id]);

    /** Behouden voor bestaande consumers die alleen totalen nodig hebben. */
    const getProjectsWithHours = useCallback(async (): Promise<ProjectWithHours[]> => {
        return getProjectStats();
    }, [getProjectStats]);

    return {
        projects,
        loading,
        addProject,
        deleteProject,
        updateProject,
        getProjectStats,
        getProjectsWithHours,
        refresh: fetchProjects
    };
};
