import React, { useState, useEffect } from 'react';
import { Moon, Sun, Save } from 'lucide-react';
import type { DailyHabit } from '../types/work';

interface DailyHabitsFormProps {
    date: string;
    habit: DailyHabit | undefined;
    onSave: (date: string, wake: string | null, sleep: string | null) => Promise<void>;
}

export const DailyHabitsForm: React.FC<DailyHabitsFormProps> = ({ date, habit, onSave }) => {
    const [wakeTime, setWakeTime] = useState(habit?.wake_time || '');
    const [sleepTime, setSleepTime] = useState(habit?.sleep_time || '');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setWakeTime(habit?.wake_time || '');
        setSleepTime(habit?.sleep_time || '');
    }, [habit, date]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await onSave(date, wakeTime || null, sleepTime || null);
        } finally {
            setIsSaving(false);
        }
    };

    const labelStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--spacing-2xs)',
    };

    return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-sm)', alignItems: 'flex-start' }}>
            <div style={{ flex: '1 1 150px' }}>
                <label className="label" htmlFor="habit-wake" style={labelStyle}>
                    <Sun size={12} color="var(--color-primary)" /> Opstaan
                </label>
                <input
                    id="habit-wake"
                    type="time"
                    value={wakeTime}
                    onChange={(e) => setWakeTime(e.target.value)}
                    style={{ width: '100%' }}
                />
            </div>

            <div style={{ flex: '1 1 150px' }}>
                <label className="label" htmlFor="habit-sleep" style={labelStyle}>
                    <Moon size={12} color="#AF00FF" /> Slapen
                </label>
                <input
                    id="habit-sleep"
                    type="time"
                    value={sleepTime}
                    onChange={(e) => setSleepTime(e.target.value)}
                    style={{ width: '100%' }}
                />
            </div>

            <div>
                {/* Onzichtbaar label houdt de knop op één lijn met de inputs. */}
                <span className="label" aria-hidden="true">&nbsp;</span>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="btn-primary"
                    style={{
                        padding: 'var(--spacing-xs) var(--spacing-md)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--spacing-2xs)',
                    }}
                >
                    <Save size={15} />
                    {isSaving ? 'Opslaan…' : 'Opslaan'}
                </button>
            </div>
        </div>
    );
};
