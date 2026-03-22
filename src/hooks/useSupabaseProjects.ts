import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export interface Project {
    id: string;
    user_id: string;
    name: string;
    color: string;
    created_at: string;
}

export interface ProjectWithHours extends Project {
    total_hours: number;
}

export const useSupabaseProjects = () => {
    const { user } = useAuth();
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchProjects = async () => {
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
    };

    useEffect(() => {
        fetchProjects();
    }, [user?.id]);

    const addProject = async (name: string, color: string = '#FF6B00'): Promise<Project | null> => {
        if (!user) return null;

        try {
            const { data, error } = await supabase
                .from('projects')
                .insert({ user_id: user.id, name, color })
                .select()
                .single();

            if (error) {
                console.error('Error adding project:', error);
                alert('Failed to add project: ' + error.message);
                return null;
            }

            setProjects(prev => [...prev, data]);
            return data;
        } catch (err) {
            console.error('Unexpected error adding project:', err);
            alert('Failed to add project: ' + err);
            return null;
        }
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
            alert('Failed to delete project: ' + error.message);
            return;
        }

        setProjects(prev => prev.filter(p => p.id !== projectId));
    };

    const updateProject = async (projectId: string, updates: { name?: string; color?: string }) => {
        if (!user) return;

        const { error } = await supabase
            .from('projects')
            .update(updates)
            .eq('id', projectId)
            .eq('user_id', user.id);

        if (error) {
            console.error('Error updating project:', error);
            alert('Failed to update project: ' + error.message);
            return;
        }

        setProjects(prev => prev.map(p => p.id === projectId ? { ...p, ...updates } : p));
    };

    const getProjectsWithHours = async (): Promise<ProjectWithHours[]> => {
        if (!user) return [];

        try {
            // Fetch all projects
            const { data: projectsData, error: projectsError } = await supabase
                .from('projects')
                .select('*')
                .eq('user_id', user.id);

            if (projectsError || !projectsData) return [];

            // Fetch all work log entries with project_id
            const { data: entriesData, error: entriesError } = await supabase
                .from('work_log_entries')
                .select('project_id, hours')
                .eq('user_id', user.id)
                .not('project_id', 'is', null);

            if (entriesError) {
                console.error('Error fetching entries for project hours:', entriesError);
                return projectsData.map(p => ({ ...p, total_hours: 0 }));
            }

            // Sum hours per project
            const hoursMap: Record<string, number> = {};
            (entriesData || []).forEach(entry => {
                if (entry.project_id) {
                    hoursMap[entry.project_id] = (hoursMap[entry.project_id] || 0) + Number(entry.hours);
                }
            });

            // Merge and sort by total_hours descending
            const result = projectsData.map(p => ({
                ...p,
                total_hours: hoursMap[p.id] || 0
            }));
            result.sort((a, b) => b.total_hours - a.total_hours);

            return result;
        } catch (err) {
            console.error('Unexpected error getting projects with hours:', err);
            return [];
        }
    };

    return {
        projects,
        loading,
        addProject,
        deleteProject,
        updateProject,
        getProjectsWithHours,
        refresh: fetchProjects
    };
};
