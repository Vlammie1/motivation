import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import type { OtherActivity } from '../types/work';

export const useSupabaseOtherActivities = () => {
    const { user } = useAuth();
    const [activities, setActivities] = useState<Record<string, OtherActivity[]>>({});
    const [loading, setLoading] = useState(true);

    const fetchOtherActivities = useCallback(async () => {
        if (!user) {
            setActivities({});
            setLoading(false);
            return;
        }
        setLoading(true);
        const { data, error } = await supabase
            .from('other_activities')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: true });

        if (!error && data) {
            const grouped = data.reduce((acc: Record<string, OtherActivity[]>, item: OtherActivity) => {
                const date = item.work_date;
                if (!acc[date]) acc[date] = [];
                acc[date].push(item);
                return acc;
            }, {});
            setActivities(grouped);
        }
        setLoading(false);
    }, [user?.id]);

    // De inserts en deletes werken de lijst hier bij; alles opnieuw ophalen zou
    // een tweede rondje naar Supabase kosten voor data die we al hebben.
    const addOtherActivity = async (date: string, label: string, hours: number, note: string | null) => {
        if (!user) return;
        const { data, error } = await supabase
            .from('other_activities')
            .insert({
                user_id: user.id,
                work_date: date,
                label,
                hours,
                note
            })
            .select()
            .single();

        if (!error && data) {
            setActivities(prev => ({ ...prev, [date]: [...(prev[date] || []), data] }));
        }
        return { data, error };
    };

    const deleteOtherActivity = async (id: string) => {
        const { error } = await supabase
            .from('other_activities')
            .delete()
            .eq('id', id);

        if (!error) {
            setActivities(prev => {
                const next: Record<string, OtherActivity[]> = {};
                Object.entries(prev).forEach(([date, list]) => {
                    const kept = list.filter(a => a.id !== id);
                    if (kept.length) next[date] = kept;
                });
                return next;
            });
        }
        return { error };
    };

    useEffect(() => {
        fetchOtherActivities();
    }, [fetchOtherActivities]);

    return { activities, loading, addOtherActivity, deleteOtherActivity, fetchOtherActivities };
};
