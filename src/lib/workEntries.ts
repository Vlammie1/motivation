import { supabase } from './supabase';
import { bumpWorkDataEpoch } from './cache';

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

export interface WorkEntryRow {
    id: string;
    user_id: string;
    work_date: string;
    hours: number;
    note: string | null;
    project_id: string | null;
    created_at: string;
}

/** De aangemaakte sessie plus het nieuwe dagtotaal, zodat de UI kan bijwerken
 *  zonder alles opnieuw op te halen. */
export const insertWorkEntry = async (
    userId: string,
    date: string,
    hours: number,
    note?: string,
    projectId?: string
): Promise<{ total: number; entry: WorkEntryRow }> => {
    const { data, error } = await supabase
        .from('work_log_entries')
        .insert({
            user_id: userId,
            work_date: date,
            hours,
            note: note || null,
            project_id: projectId || null
        })
        .select()
        .single();

    if (error) throw new Error(error.message);

    const total = await recalcDayTotal(userId, date);
    bumpWorkDataEpoch();
    return { total, entry: data as WorkEntryRow };
};

/** Uren, notitie of project van een bestaande sessie corrigeren. Het dagtotaal
 *  wordt opnieuw afgeleid, want de uren kunnen veranderd zijn. */
export const updateWorkEntry = async (
    userId: string,
    entryId: string,
    date: string,
    updates: { hours?: number; note?: string | null; project_id?: string | null }
): Promise<{ total: number; entry: WorkEntryRow }> => {
    const { data, error } = await supabase
        .from('work_log_entries')
        .update(updates)
        .eq('id', entryId)
        .eq('user_id', userId)
        .select()
        .single();

    if (error) throw new Error(error.message);

    const total = await recalcDayTotal(userId, date);
    bumpWorkDataEpoch();
    return { total, entry: data as WorkEntryRow };
};

export const deleteWorkEntry = async (userId: string, entryId: string, date: string): Promise<number> => {
    const { error } = await supabase
        .from('work_log_entries')
        .delete()
        .eq('id', entryId)
        .eq('user_id', userId);

    if (error) throw new Error(error.message);

    const total = await recalcDayTotal(userId, date);
    bumpWorkDataEpoch();
    return total;
};
