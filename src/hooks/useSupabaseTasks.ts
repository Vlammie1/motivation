import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export interface Task {
    id: string;
    user_id: string;
    title: string;
    description: string;
    completed: boolean;
    created_at: string;
}

export const useSupabaseTasks = () => {
    const { user } = useAuth();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchTasks = useCallback(async () => {
        if (!user) {
            console.log('No user, skipping task fetch');
            setLoading(false);
            setTasks([]);
            return;
        }

        console.log('Fetching tasks for user:', user.id);
        setLoading(true);

        try {
            const { data, error } = await supabase
                .from('tasks')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: true });

            if (error) {
                console.error('Error fetching tasks:', error);
                setTasks([]);
            } else {
                console.log('Tasks fetched:', data?.length || 0);
                setTasks(data || []);
            }
        } catch (err) {
            console.error('Unexpected error fetching tasks:', err);
            setTasks([]);
        } finally {
            setLoading(false);
        }
    }, [user]); // Only re-fetch when user ID changes

    useEffect(() => {
        fetchTasks();
    }, [fetchTasks]);

    const addTask = async (title: string, description: string) => {
        if (!user) {
            console.error('Cannot add task: no user');
            return;
        }

        console.log('Adding task:', title);

        try {
            const { data, error } = await supabase
                .from('tasks')
                .insert({
                    user_id: user.id,
                    title,
                    description,
                    completed: false
                })
                .select()
                .single();

            if (error) {
                console.error('Error adding task:', error);
                alert('Failed to add task: ' + error.message);
            } else if (data) {
                console.log('Task added successfully:', data);
                setTasks(prev => [...prev, data]);
            }
        } catch (err) {
            console.error('Unexpected error adding task:', err);
            alert('Failed to add task: ' + err);
        }
    };

    const toggleTask = async (id: string, completed: boolean) => {
        console.log('Toggling task:', id, completed);

        // Optimistic update: Update UI immediately
        setTasks(prev => prev.map(t =>
            t.id === id ? { ...t, completed } : t
        ));

        try {
            const { error } = await supabase
                .from('tasks')
                .update({ completed })
                .eq('id', id);

            if (error) {
                console.error('Error toggling task:', error);
                // Revert optimistic update on error
                setTasks(prev => prev.map(t =>
                    t.id === id ? { ...t, completed: !completed } : t
                ));
                alert('Failed to update task: ' + error.message);
            } else {
                console.log('Task toggled successfully');
            }
        } catch (err) {
            console.error('Unexpected error toggling task:', err);
            // Revert optimistic update on error
            setTasks(prev => prev.map(t =>
                t.id === id ? { ...t, completed: !completed } : t
            ));
        }
    };

    const deleteTask = async (id: string) => {
        if (!confirm('Are you sure you want to delete this task?')) return;

        // Optimistic update
        setTasks(prev => prev.filter(t => t.id !== id));

        try {
            const { error } = await supabase
                .from('tasks')
                .delete()
                .eq('id', id);

            if (error) {
                console.error('Error deleting task:', error);
                alert('Failed to delete task: ' + error.message);
                // Trigger re-fetch to restore state if needed, or implement revert logic
                fetchTasks();
            }
        } catch (err) {
            console.error('Unexpected error deleting task:', err);
            fetchTasks();
        }
    };

    return {
        tasks,
        loading,
        addTask,
        toggleTask,
        deleteTask
    };
};
