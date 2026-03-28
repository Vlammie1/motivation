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

    const inputStyle: React.CSSProperties = {
        width: '100%',
        padding: 'var(--spacing-sm)',
        border: 'var(--brutalist-border)',
        fontSize: '1.1rem',
        fontFamily: 'var(--font-heading)',
        outline: 'none',
        background: 'var(--color-bg)',
        color: 'var(--color-text)',
        boxSizing: 'border-box'
    };

    return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-md)', alignItems: 'flex-end' }}>
            <div style={{ flex: '1 1 150px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', textTransform: 'uppercase', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '4px' }}>
                    <Sun size={14} color="var(--color-primary)" /> Wake Up
                </label>
                <input
                    type="time"
                    value={wakeTime}
                    onChange={(e) => setWakeTime(e.target.value)}
                    style={inputStyle}
                />
            </div>

            <div style={{ flex: '1 1 150px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', textTransform: 'uppercase', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '4px' }}>
                    <Moon size={14} color="#AF00FF" /> Sleep
                </label>
                <input
                    type="time"
                    value={sleepTime}
                    onChange={(e) => setSleepTime(e.target.value)}
                    style={inputStyle}
                />
            </div>

            <button
                onClick={handleSave}
                disabled={isSaving}
                style={{
                    background: 'var(--color-text)',
                    color: 'var(--color-bg)',
                    padding: 'var(--spacing-sm) var(--spacing-xl)',
                    fontSize: '1rem',
                    fontWeight: 'bold',
                    fontFamily: 'var(--font-heading)',
                    textTransform: 'uppercase',
                    border: 'var(--brutalist-border)',
                    cursor: 'pointer',
                    boxShadow: '4px 4px 0px var(--color-primary)',
                    height: '46px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    opacity: isSaving ? 0.7 : 1
                }}
                onMouseDown={e => e.currentTarget.style.boxShadow = 'none'}
                onMouseUp={e => e.currentTarget.style.boxShadow = '4px 4px 0px var(--color-primary)'}
            >
                <Save size={18} />
                {isSaving ? 'Saving...' : 'Save Habits'}
            </button>
        </div>
    );
};
