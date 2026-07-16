import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useProjects } from '../context/ProjectsContext';
import type { Project } from '../hooks/useSupabaseProjects';
import { insertWorkEntry } from '../lib/workEntries';
import { localDateKey, MS_PER_HOUR } from '../lib/time';

/** Boven deze grens gaan we ervan uit dat je vergeten bent te stoppen en vragen
 *  we bij terugkomst hoeveel er écht gewerkt is. */
export const STALE_AFTER_MS = 4 * MS_PER_HOUR;

export interface ActiveTimer {
    project_id: string | null;
    intent: string | null;
    started_at: string;
    sound_enabled: boolean;
}

export type TimerModal =
    | { type: 'start'; projectId?: string }
    | { type: 'confirm'; mode: 'stop' | 'switch'; stale: boolean }
    | null;

interface TimerValue {
    timer: ActiveTimer | null;
    project: Project | null;
    elapsedMs: number;
    modal: TimerModal;
    minimized: boolean;
    busy: boolean;
    /** Naam van het project waar je net vandaan wisselt, voor de bevestiging in het startscherm. */
    switchedFrom: string | null;
    /** Telt op na elke opgeslagen sessie, zodat pagina's hun cijfers kunnen verversen. */
    version: number;
    openStart: (projectId?: string) => void;
    closeStart: () => void;
    startTimer: (projectId: string, intent: string) => Promise<void>;
    requestStop: () => void;
    requestSwitch: () => void;
    cancelConfirm: () => void;
    saveAndFinish: (hours: number, note: string) => Promise<void>;
    discardTimer: () => Promise<void>;
    setSoundEnabled: (enabled: boolean) => Promise<void>;
    setMinimized: (minimized: boolean) => void;
}

const TimerContext = createContext<TimerValue | null>(null);

export const TimerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const { projects } = useProjects();

    const [timer, setTimer] = useState<ActiveTimer | null>(null);
    const [elapsedMs, setElapsedMs] = useState(0);
    const [modal, setModal] = useState<TimerModal>(null);
    const [minimized, setMinimized] = useState(false);
    const [busy, setBusy] = useState(false);
    const [version, setVersion] = useState(0);
    const [switchedFrom, setSwitchedFrom] = useState<string | null>(null);

    // Per timer één keer vragen of je vergeten bent te stoppen — niet elke keer
    // dat je het tabblad terugpakt.
    const staleAskedRef = useRef<string | null>(null);
    const modalRef = useRef<TimerModal>(null);
    const timerRef = useRef<ActiveTimer | null>(null);
    useEffect(() => { modalRef.current = modal; }, [modal]);
    useEffect(() => { timerRef.current = timer; }, [timer]);

    const project = timer?.project_id ? projects.find(p => p.id === timer.project_id) || null : null;
    const projectRef = useRef<Project | null>(null);
    useEffect(() => { projectRef.current = project; }, [project]);

    const maybeAskStale = useCallback((t: ActiveTimer) => {
        if (Date.now() - new Date(t.started_at).getTime() < STALE_AFTER_MS) return;
        if (staleAskedRef.current === t.started_at) return;
        if (modalRef.current) return;
        staleAskedRef.current = t.started_at;
        setModal({ type: 'confirm', mode: 'stop', stale: true });
    }, []);

    // Actieve timer ophalen bij login / herladen.
    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            if (!user) {
                setTimer(null);
                return;
            }

            const { data, error } = await supabase
                .from('active_timers')
                .select('project_id, intent, started_at, sound_enabled')
                .eq('user_id', user.id)
                .maybeSingle();

            if (cancelled) return;
            if (error) {
                console.error('Error loading active timer:', error);
                return;
            }
            if (!data) {
                setTimer(null);
                return;
            }

            setTimer(data);
            setMinimized(true);
            maybeAskStale(data);
        };

        load();
        return () => { cancelled = true; };
    }, [user?.id, maybeAskStale]);

    // Verstreken tijd. Browsers knijpen intervals af in achtergrondtabs, dus we
    // rekenen elke tick opnieuw vanaf started_at in plaats van op te tellen.
    useEffect(() => {
        if (!timer) {
            setElapsedMs(0);
            return;
        }

        const startedAt = new Date(timer.started_at).getTime();
        const tick = () => setElapsedMs(Date.now() - startedAt);

        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [timer?.started_at]);

    useEffect(() => {
        const onVisible = () => {
            const t = timerRef.current;
            if (document.visibilityState !== 'visible' || !t) return;
            setElapsedMs(Date.now() - new Date(t.started_at).getTime());
            maybeAskStale(t);
        };

        document.addEventListener('visibilitychange', onVisible);
        return () => document.removeEventListener('visibilitychange', onVisible);
    }, [maybeAskStale]);

    const clearTimerRow = useCallback(async () => {
        if (!user) return;
        const { error } = await supabase.from('active_timers').delete().eq('user_id', user.id);
        if (error) console.error('Error clearing active timer:', error);
        setTimer(null);
        staleAskedRef.current = null;
    }, [user?.id]);

    const startTimer = useCallback(async (projectId: string, intent: string) => {
        if (!user) return;
        setBusy(true);

        const row = {
            user_id: user.id,
            project_id: projectId,
            intent: intent.trim() || null,
            started_at: new Date().toISOString(),
            sound_enabled: timerRef.current?.sound_enabled ?? true,
            updated_at: new Date().toISOString()
        };

        const { data, error } = await supabase
            .from('active_timers')
            .upsert(row, { onConflict: 'user_id' })
            .select('project_id, intent, started_at, sound_enabled')
            .single();

        setBusy(false);

        if (error) {
            console.error('Error starting timer:', error);
            alert('Timer starten mislukt: ' + error.message);
            return;
        }

        staleAskedRef.current = null;
        setTimer(data);
        setModal(null);
        setSwitchedFrom(null);
        setMinimized(false);
    }, [user?.id]);

    const saveAndFinish = useCallback(async (hours: number, note: string) => {
        const current = timerRef.current;
        if (!user || !current) return;

        const mode = modalRef.current?.type === 'confirm' ? modalRef.current.mode : 'stop';
        const previousProjectName = projectRef.current?.name || null;
        setBusy(true);

        try {
            if (hours > 0) {
                // Een sessie hoort bij de dag waarop je begon, ook als je na
                // middernacht stopt.
                const date = localDateKey(new Date(current.started_at));
                await insertWorkEntry(
                    user.id,
                    date,
                    Math.round(hours * 100) / 100,
                    note.trim() || undefined,
                    current.project_id || undefined
                );
                setVersion(v => v + 1);
            }
            await clearTimerRow();
            setSwitchedFrom(mode === 'switch' ? previousProjectName : null);
            setModal(mode === 'switch' ? { type: 'start' } : null);
        } catch (err) {
            console.error('Error saving session:', err);
            alert('Sessie opslaan mislukt: ' + (err instanceof Error ? err.message : err));
        } finally {
            setBusy(false);
        }
    }, [user?.id, clearTimerRow]);

    const discardTimer = useCallback(async () => {
        setBusy(true);
        await clearTimerRow();
        setBusy(false);
        setModal(null);
    }, [clearTimerRow]);

    const setSoundEnabled = useCallback(async (enabled: boolean) => {
        if (!user || !timerRef.current) return;
        setTimer(prev => (prev ? { ...prev, sound_enabled: enabled } : prev));
        const { error } = await supabase
            .from('active_timers')
            .update({ sound_enabled: enabled })
            .eq('user_id', user.id);
        if (error) console.error('Error updating sound preference:', error);
    }, [user?.id]);

    const value: TimerValue = {
        timer,
        project,
        elapsedMs,
        modal,
        minimized,
        busy,
        switchedFrom,
        version,
        openStart: (projectId?: string) => { setSwitchedFrom(null); setModal({ type: 'start', projectId }); },
        closeStart: () => { setSwitchedFrom(null); setModal(null); },
        startTimer,
        requestStop: () => setModal({ type: 'confirm', mode: 'stop', stale: false }),
        requestSwitch: () => setModal({ type: 'confirm', mode: 'switch', stale: false }),
        cancelConfirm: () => setModal(null),
        saveAndFinish,
        discardTimer,
        setSoundEnabled,
        setMinimized
    };

    return <TimerContext.Provider value={value}>{children}</TimerContext.Provider>;
};

export const useTimer = (): TimerValue => {
    const ctx = useContext(TimerContext);
    if (!ctx) throw new Error('useTimer moet binnen een TimerProvider staan');
    return ctx;
};
