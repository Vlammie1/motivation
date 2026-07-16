import React, { createContext, useContext, useMemo } from 'react';
import { useSupabaseWorkLogs } from '../hooks/useSupabaseWorkLogs';
import { useSupabaseDailyHabits } from '../hooks/useSupabaseDailyHabits';
import { useSupabaseOtherActivities } from '../hooks/useSupabaseOtherActivities';
import type { WorkLogEntry } from '../hooks/useSupabaseWorkLogs';
import type { DailyHabit, OtherActivity } from '../types/work';

type OtherActivitiesValue = ReturnType<typeof useSupabaseOtherActivities>;

interface WorkDataValue {
    /** Uren per dag, over het hele jaar. */
    workLogs: Record<string, number>;
    /** Losse sessies binnen het recente venster, voor de grafieken. */
    recentEntries: WorkLogEntry[];
    loading: boolean;
    addWorkLogEntry: (date: string, hours: number, note?: string, projectId?: string) => Promise<void>;
    fetchWorkLogEntries: (date: string) => Promise<WorkLogEntry[]>;
    editWorkLogEntry: (
        entryId: string,
        date: string,
        updates: { hours?: number; note?: string | null; project_id?: string | null }
    ) => Promise<void>;
    deleteWorkLogEntry: (entryId: string, date: string) => Promise<void>;
    refreshWorkLogs: () => Promise<void>;

    dailyHabits: Record<string, DailyHabit>;
    upsertDailyHabit: (date: string, wakeTime: string | null, sleepTime: string | null) => Promise<void>;

    otherActivities: Record<string, OtherActivity[]>;
    /** Dezelfde activiteiten als platte lijst, voor de grafieken. */
    otherActivitiesList: OtherActivity[];
    addOtherActivity: OtherActivitiesValue['addOtherActivity'];
    deleteOtherActivity: OtherActivitiesValue['deleteOtherActivity'];
}

const WorkDataContext = createContext<WorkDataValue | null>(null);

/** Uren, gewoontes en activiteiten worden hier één keer opgehaald en gedeeld.
 *  Deze provider staat boven de routes, zodat navigeren tussen pagina's geen
 *  nieuwe queries kost en de cijfers meteen staan. */
export const WorkDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const {
        workLogs, recentEntries, loading: logsLoading,
        addWorkLogEntry, fetchWorkLogEntries, editWorkLogEntry, deleteWorkLogEntry, refresh: refreshWorkLogs
    } = useSupabaseWorkLogs();
    const { dailyHabits, loading: habitsLoading, upsertDailyHabit } = useSupabaseDailyHabits();
    const { activities: otherActivities, loading: activitiesLoading, addOtherActivity, deleteOtherActivity } =
        useSupabaseOtherActivities();

    const otherActivitiesList = useMemo(
        () => Object.values(otherActivities).flat(),
        [otherActivities]
    );

    const value = useMemo<WorkDataValue>(() => ({
        workLogs,
        recentEntries,
        loading: logsLoading || habitsLoading || activitiesLoading,
        addWorkLogEntry,
        fetchWorkLogEntries,
        editWorkLogEntry,
        deleteWorkLogEntry,
        refreshWorkLogs,
        dailyHabits,
        upsertDailyHabit,
        otherActivities,
        otherActivitiesList,
        addOtherActivity,
        deleteOtherActivity
    }), [
        workLogs, recentEntries, logsLoading, habitsLoading, activitiesLoading,
        addWorkLogEntry, fetchWorkLogEntries, editWorkLogEntry, deleteWorkLogEntry, refreshWorkLogs,
        dailyHabits, upsertDailyHabit, otherActivities, otherActivitiesList,
        addOtherActivity, deleteOtherActivity
    ]);

    return <WorkDataContext.Provider value={value}>{children}</WorkDataContext.Provider>;
};

export const useWorkData = (): WorkDataValue => {
    const ctx = useContext(WorkDataContext);
    if (!ctx) throw new Error('useWorkData moet binnen een WorkDataProvider staan');
    return ctx;
};
