import { supabase } from './supabase';

// work_logs houdt per dag het totaal bij, work_log_entries de losse sessies.
// Elke mutatie op entries moet het dagtotaal opnieuw afleiden, anders lopen ze uiteen.
export const recalcDayTotal = async (userId: string, date: string): Promise<number> => {
    const { data, error } = await supabase
        .from('work_log_entries')
        .select('hours')
        .eq('user_id', userId)
        .eq('work_date', date);

    if (error) throw new Error(error.message);

    const total = (data || []).reduce((sum, e) => sum + Number(e.hours), 0);

    if (total === 0) {
        const { error: deleteError } = await supabase
            .from('work_logs')
            .delete()
            .eq('user_id', userId)
            .eq('work_date', date);
        if (deleteError) throw new Error(deleteError.message);
        return 0;
    }

    const { error: upsertError } = await supabase
        .from('work_logs')
        .upsert({ user_id: userId, work_date: date, hours: total }, { onConflict: 'user_id,work_date' });
    if (upsertError) throw new Error(upsertError.message);

    return total;
};

export const insertWorkEntry = async (
    userId: string,
    date: string,
    hours: number,
    note?: string,
    projectId?: string
): Promise<number> => {
    const { error } = await supabase
        .from('work_log_entries')
        .insert({
            user_id: userId,
            work_date: date,
            hours,
            note: note || null,
            project_id: projectId || null
        });

    if (error) throw new Error(error.message);

    return recalcDayTotal(userId, date);
};

export const deleteWorkEntry = async (userId: string, entryId: string, date: string): Promise<number> => {
    const { error } = await supabase
        .from('work_log_entries')
        .delete()
        .eq('id', entryId)
        .eq('user_id', userId);

    if (error) throw new Error(error.message);

    return recalcDayTotal(userId, date);
};
