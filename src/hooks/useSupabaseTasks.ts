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

        try {
            const { error } = await supabase
                .from('tasks')
                .update({ completed })
                .eq('id', id);

            if (error) {
                console.error('Error toggling task:', error);
            } else {
                setTasks(prev => prev.map(t => t.id === id ? { ...t, completed } : t));
            }
        } catch (err) {
            console.error('Unexpected error toggling task:', err);
        }
    };

    const deleteTask = async (id: string) => {
        console.log('Deleting task:', id);

        try {
            const { error } = await supabase
                .from('tasks')
                .delete()
                .eq('id', id);

            if (error) {
                console.error('Error deleting task:', error);
            } else {
                setTasks(prev => prev.filter(t => t.id !== id));
            }
        } catch (err) {
            console.error('Unexpected error deleting task:', err);
        }
    };

    return { tasks, loading, addTask, toggleTask, deleteTask, refresh: fetchTasks };
};
