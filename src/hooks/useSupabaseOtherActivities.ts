import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import type { OtherActivity } from '../types/work';

export const useSupabaseOtherActivities = () => {
    const { user } = useAuth();
    const [activities, setActivities] = useState<Record<string, OtherActivity[]>>({});
    const [loading, setLoading] = useState(true);

    const fetchOtherActivities = async () => {
        if (!user) return;
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
    };

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
            .select();

        if (!error && data) {
            await fetchOtherActivities();
        }
        return { data, error };
    };

    const deleteOtherActivity = async (id: string) => {
        const { error } = await supabase
            .from('other_activities')
            .delete()
            .eq('id', id);

        if (!error) {
            await fetchOtherActivities();
        }
        return { error };
    };

    useEffect(() => {
        if (user) fetchOtherActivities();
    }, [user]);

    return { activities, loading, addOtherActivity, deleteOtherActivity, fetchOtherActivities };
};
