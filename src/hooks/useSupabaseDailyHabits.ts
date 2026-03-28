import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import type { DailyHabit } from '../types/work';

export const useSupabaseDailyHabits = () => {
    const { user } = useAuth();
    const [dailyHabits, setDailyHabits] = useState<Record<string, DailyHabit>>({});
    const [loading, setLoading] = useState(true);

    const fetchAllDailyHabits = useCallback(async () => {
        if (!user) {
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('daily_habits')
                .select('*')
                .eq('user_id', user.id);

            if (error) {
                console.error('Error fetching daily habits:', error);
            } else {
                const habitsMap: Record<string, DailyHabit> = {};
                data?.forEach(habit => {
                    habitsMap[habit.work_date] = habit;
                });
                setDailyHabits(habitsMap);
            }
        } catch (err) {
            console.error('Unexpected error fetching daily habits:', err);
        } finally {
            setLoading(false);
        }
    }, [user?.id]);

    useEffect(() => {
        fetchAllDailyHabits();
    }, [fetchAllDailyHabits]);

    const upsertDailyHabit = async (date: string, wakeTime: string | null, sleepTime: string | null) => {
        if (!user) return;

        try {
            const { data, error } = await supabase
                .from('daily_habits')
                .upsert({
                    user_id: user.id,
                    work_date: date,
                    wake_time: wakeTime,
                    sleep_time: sleepTime
                }, { onConflict: 'user_id,work_date' })
                .select()
                .single();

            if (error) {
                console.error('Error upserting daily habit:', error);
                alert('Failed to save habit: ' + error.message);
            } else if (data) {
                setDailyHabits(prev => ({
                    ...prev,
                    [date]: data
                }));
            }
        } catch (err) {
            console.error('Unexpected error upserting daily habit:', err);
            alert('Failed to save habit: ' + err);
        }
    };

    return {
        dailyHabits,
        loading,
        upsertDailyHabit,
        refresh: fetchAllDailyHabits
    };
};
