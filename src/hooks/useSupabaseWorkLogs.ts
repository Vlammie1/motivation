import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { insertWorkEntry, deleteWorkEntry, updateWorkEntry } from '../lib/workEntries';
import { localDateKey } from '../lib/time';

/** De activiteitengrafiek toont dit venster; we halen precies zoveel sessies op. */
export const RECENT_ENTRY_DAYS = 30;

const recentWindowStart = () =>
    localDateKey(new Date(Date.now() - RECENT_ENTRY_DAYS * 86400000));

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
    const [recentEntries, setRecentEntries] = useState<WorkLogEntry[]>([]);
    const [loading, setLoading] = useState(true);

    // Alleen de eerste keer een spinner tonen; latere verversingen mogen de
    // bestaande cijfers laten staan.
    const loadedRef = useRef(false);

    // fetchWorkLogEntries leest de recente sessies zonder er een dependency van
    // te worden, zodat de functie-identiteit stabiel blijft.
    const recentEntriesRef = useRef<WorkLogEntry[]>([]);
    recentEntriesRef.current = recentEntries;

    const fetchWorkLogs = useCallback(async () => {
        if (!user) {
            setWorkLogs({});
            setRecentEntries([]);
            setLoading(false);
            return;
        }

        if (!loadedRef.current) setLoading(true);

        try {
            // Totalen en recente sessies naast elkaar — niet achter elkaar.
            const [totals, entries] = await Promise.all([
                supabase
                    .from('work_logs')
                    .select('work_date, hours')
                    .eq('user_id', user.id),
                supabase
                    .from('work_log_entries')
                    .select('*')
                    .eq('user_id', user.id)
                    .gte('work_date', recentWindowStart())
                    .order('work_date', { ascending: true })
                    .order('created_at', { ascending: true })
            ]);

            if (totals.error) {
                console.error('Error fetching work logs:', totals.error);
            } else {
                const logs: Record<string, number> = {};
                totals.data?.forEach(log => {
                    logs[log.work_date] = Number(log.hours);
                });
                setWorkLogs(logs);
            }

            if (entries.error) {
                console.error('Error fetching recent work log entries:', entries.error);
            } else {
                setRecentEntries(entries.data || []);
            }
        } catch (err) {
            console.error('Unexpected error fetching work logs:', err);
        } finally {
            loadedRef.current = true;
            setLoading(false);
        }
    }, [user?.id]);

    useEffect(() => {
        loadedRef.current = false;
        fetchWorkLogs();
    }, [fetchWorkLogs]);

    const addWorkLogEntry = async (date: string, hours: number, note?: string, projectId?: string) => {
        if (!user) return;

        try {
            const { total, entry } = await insertWorkEntry(user.id, date, hours, note, projectId);
            setWorkLogs(prev => ({ ...prev, [date]: total }));
            if (entry.work_date >= recentWindowStart()) {
                setRecentEntries(prev => [...prev, entry]);
            }
        } catch (err) {
            console.error('Error adding work log entry:', err);
            alert('Sessie opslaan mislukt: ' + (err instanceof Error ? err.message : err));
        }
    };

    const fetchWorkLogEntries = async (date: string): Promise<WorkLogEntry[]> => {
        if (!user) return [];

        // Dagen binnen het recente venster hebben we al staan — geen query nodig.
        if (date >= recentWindowStart()) {
            return recentEntriesRef.current.filter(e => e.work_date === date);
        }

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

    const editWorkLogEntry = async (
        entryId: string,
        date: string,
        updates: { hours?: number; note?: string | null; project_id?: string | null }
    ) => {
        if (!user) return;

        try {
            const { total, entry } = await updateWorkEntry(user.id, entryId, date, updates);
            setWorkLogs(prev => ({ ...prev, [date]: total }));
            setRecentEntries(prev => prev.map(e => (e.id === entryId ? entry : e)));
        } catch (err) {
            console.error('Error updating work log entry:', err);
            alert('Sessie bijwerken mislukt: ' + (err instanceof Error ? err.message : err));
        }
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
            setRecentEntries(prev => prev.filter(e => e.id !== entryId));
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

    return { workLogs, recentEntries, loading, upsertWorkLog, addWorkLogEntry, fetchWorkLogEntries, editWorkLogEntry, deleteWorkLogEntry, refresh: fetchWorkLogs };
};
