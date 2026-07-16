import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { insertWorkEntry, deleteWorkEntry } from '../lib/workEntries';

export interface WorkLog {
    id: string;
    user_id: string;
    work_date: string;
    hours: number;
    created_at: string;
}

export interface WorkLogEntry {
    id: string;
    user_id: string;
    work_date: string;
    hours: number;
    note: string | null;
    project_id: string | null;
    created_at: string;
}

export const useSupabaseWorkLogs = () => {
    const { user } = useAuth();
    const [workLogs, setWorkLogs] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(true);

    const fetchWorkLogs = async () => {
        if (!user) {
            setLoading(false);
            setWorkLogs({});
            return;
        }

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
    }, [user?.id]);

    const addWorkLogEntry = async (date: string, hours: number, note?: string, projectId?: string) => {
        if (!user) return;

        try {
            const newTotal = await insertWorkEntry(user.id, date, hours, note, projectId);
            setWorkLogs(prev => ({ ...prev, [date]: newTotal }));
        } catch (err) {
            console.error('Error adding work log entry:', err);
            alert('Sessie opslaan mislukt: ' + (err instanceof Error ? err.message : err));
        }
    };

    const fetchWorkLogEntries = async (date: string): Promise<WorkLogEntry[]> => {
        if (!user) return [];

        const { data, error } = await supabase
            .from('work_log_entries')
            .select('*')
            .eq('user_id', user.id)
            .eq('work_date', date)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Error fetching work log entries:', error);
            return [];
        }

        return data || [];
    };

    const fetchWorkLogEntriesInRange = async (startDate: string, endDate: string): Promise<WorkLogEntry[]> => {
        if (!user) return [];

        const { data, error } = await supabase
            .from('work_log_entries')
            .select('*')
            .eq('user_id', user.id)
            .gte('work_date', startDate)
            .lte('work_date', endDate)
            .order('work_date', { ascending: true })
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Error fetching work log entries in range:', error);
            return [];
        }

        return data || [];
    };

    const deleteWorkLogEntry = async (entryId: string, date: string) => {
        if (!user) return;

        try {
            const newTotal = await deleteWorkEntry(user.id, entryId, date);
            setWorkLogs(prev => {
                if (newTotal === 0) {
                    const next = { ...prev };
                    delete next[date];
                    return next;
                }
                return { ...prev, [date]: newTotal };
            });
        } catch (err) {
            console.error('Error deleting work log entry:', err);
            alert('Sessie verwijderen mislukt: ' + (err instanceof Error ? err.message : err));
        }
    };

    // Keep upsertWorkLog for legacy compatibility (direct set)
    const upsertWorkLog = async (date: string, hours: number) => {
        if (!user) return;

        try {
            const { error } = await supabase
                .from('work_logs')
                .upsert({ user_id: user.id, work_date: date, hours }, { onConflict: 'user_id,work_date' });

            if (error) {
                console.error('Error upserting work log:', error);
                alert('Failed to save work log: ' + error.message);
            } else {
                setWorkLogs(prev => ({ ...prev, [date]: hours }));
            }
        } catch (err) {
            console.error('Unexpected error upserting work log:', err);
            alert('Failed to save work log: ' + err);
        }
    };

    return { workLogs, loading, upsertWorkLog, addWorkLogEntry, fetchWorkLogEntries, fetchWorkLogEntriesInRange, deleteWorkLogEntry, refresh: fetchWorkLogs };
};
