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
        if (!user) return;
        setLoading(true);
        const { data, error } = await supabase
            .from('work_logs')
            .select('*')
            .eq('user_id', user.id);

        if (error) {
            console.error('Error fetching work logs:', error);
        } else {
            const logs: Record<string, number> = {};
            data?.forEach(log => {
                logs[log.work_date] = Number(log.hours);
            });
            setWorkLogs(logs);
        }
        setLoading(false);
    };

    useEffect(() => {
        if (!user) {
            setLoading(false);
            setWorkLogs({});
            return;
        }
        fetchWorkLogs();
    }, [user]);

    const upsertWorkLog = async (date: string, hours: number) => {
        if (!user) return;

        // Check if entry exists for this date
        const { data: existing } = await supabase
            .from('work_logs')
            .select('id')
            .eq('user_id', user.id)
            .eq('work_date', date)
            .single();

        let error;
        if (existing) {
            const { error: updateError } = await supabase
                .from('work_logs')
                .update({ hours })
                .eq('id', existing.id);
            error = updateError;
        } else {
            const { error: insertError } = await supabase
                .from('work_logs')
                .insert({
                    user_id: user.id,
                    work_date: date,
                    hours
                });
            error = insertError;
        }

        if (error) {
            console.error('Error upserting work log:', error);
        } else {
            setWorkLogs(prev => ({ ...prev, [date]: hours }));
        }
    };

    return { workLogs, loading, upsertWorkLog, refresh: fetchWorkLogs };
};
