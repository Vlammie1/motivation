import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export interface WorkLog {
    id: string;
    user_id: string;
    work_date: string;
    hours: number;
    created_at: string;
}

export const useSupabaseWorkLogs = () => {
    const { user } = useAuth();
    const [workLogs, setWorkLogs] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(true);

    const fetchWorkLogs = async () => {
        if (!user) {
            console.log('No user, skipping work logs fetch');
            setLoading(false);
            setWorkLogs({});
            return;
        }

        console.log('Fetching work logs for user:', user.id);
        setLoading(true);

        try {
            const { data, error } = await supabase
                .from('work_logs')
                .select('*')
                .eq('user_id', user.id);

            if (error) {
                console.error('Error fetching work logs:', error);
                setWorkLogs({});
            } else {
                const logs: Record<string, number> = {};
                data?.forEach(log => {
                    logs[log.work_date] = Number(log.hours);
                });
                console.log('Work logs fetched:', Object.keys(logs).length);
                setWorkLogs(logs);
            }
        } catch (err) {
            console.error('Unexpected error fetching work logs:', err);
            setWorkLogs({});
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchWorkLogs();
    }, [user?.id]); // Only re-fetch when user ID changes

    const upsertWorkLog = async (date: string, hours: number) => {
        if (!user) {
            console.error('Cannot upsert work log: no user');
            return;
        }

        console.log('Upserting work log:', date, hours);

        try {
            // Use Supabase's native upsert to avoid race conditions
            const { error } = await supabase
                .from('work_logs')
                .upsert({
                    user_id: user.id,
                    work_date: date,
                    hours
                }, {
                    onConflict: 'user_id,work_date'
                });

            if (error) {
                console.error('Error upserting work log:', error);
                alert('Failed to save work log: ' + error.message);
            } else {
                console.log('Work log saved successfully');
                setWorkLogs(prev => ({ ...prev, [date]: hours }));
            }
        } catch (err) {
            console.error('Unexpected error upserting work log:', err);
            alert('Failed to save work log: ' + err);
        }
    };

    return { workLogs, loading, upsertWorkLog, refresh: fetchWorkLogs };
};
