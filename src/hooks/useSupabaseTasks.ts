import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export interface Task {
    id: string;
    user_id: string;
    title: string;
    why: string;
    completed: boolean;
    created_at: string;
}

export const useSupabaseTasks = () => {
    const { user } = useAuth();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchTasks = async () => {
        if (!user) return;
        setLoading(true);
        const { data, error } = await supabase
            .from('tasks')
            .select('*')
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Error fetching tasks:', error);
        } else {
            setTasks(data || []);
        }
        setLoading(false);
    };

    useEffect(() => {
        if (!user) {
            setLoading(false);
            setTasks([]);
            return;
        }
        fetchTasks();
    }, [user]);

    const addTask = async (title: string, why: string) => {
        if (!user) return;
        const { data, error } = await supabase
            .from('tasks')
            .insert({
                user_id: user.id,
                title,
                why,
                completed: false
            })
            .select()
            .single();

        if (error) {
            console.error('Error adding task:', error);
        } else if (data) {
            setTasks([...tasks, data]);
        }
    };

    const toggleTask = async (id: string, completed: boolean) => {
        const { error } = await supabase
            .from('tasks')
            .update({ completed })
            .eq('id', id);

        if (error) {
            console.error('Error toggling task:', error);
        } else {
            setTasks(tasks.map(t => t.id === id ? { ...t, completed } : t));
        }
    };

    const deleteTask = async (id: string) => {
        const { error } = await supabase
            .from('tasks')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting task:', error);
        } else {
            setTasks(tasks.filter(t => t.id !== id));
        }
    };

    return { tasks, loading, addTask, toggleTask, deleteTask, refresh: fetchTasks };
};
