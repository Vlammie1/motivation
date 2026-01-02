import { useState, useEffect } from 'react';

interface WorkLogFormProps {
    date: string;
    currentHours: number;
    onUpdate: (date: string, hours: number) => void;
}

export const WorkLogForm = ({ date, currentHours, onUpdate }: WorkLogFormProps) => {
    const [hours, setHours] = useState<string>(currentHours.toString());

    useEffect(() => {
        setHours(currentHours.toString());
    }, [currentHours, date]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const h = parseFloat(hours);
        if (!isNaN(h) && h >= 0 && h <= 24) {
            onUpdate(date, h);
        }
    };

    return (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-md)', alignItems: 'flex-end' }}>
            <div style={{ flex: 1, minWidth: '200px' }}>
                <label style={{ display: 'block', textTransform: 'uppercase', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '4px' }}>
                    Date
                </label>
                <div style={{
                    padding: 'var(--spacing-sm)',
                    border: 'var(--brutalist-border)',
                    background: 'var(--color-bg)',
                    color: 'var(--color-text)',
                    fontFamily: 'var(--font-heading)',
                    fontWeight: 'bold',
                    opacity: 0.8
                }}>
                    {date}
                </div>
            </div>

            <div style={{ flex: 1, minWidth: '150px' }}>
                <label htmlFor="hours-input" style={{ display: 'block', textTransform: 'uppercase', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '4px' }}>
                    Hours Worked
                </label>
                <input
                    id="hours-input"
                    type="number"
                    step="0.5"
                    min="0"
                    max="24"
                    value={hours}
                    onChange={(e) => setHours(e.target.value)}
                    style={{
                        width: '100%',
                        padding: 'var(--spacing-sm)',
                        border: 'var(--brutalist-border)',
                        fontSize: '1.2rem',
                        fontFamily: 'var(--font-heading)',
                        outline: 'none'
                    }}
                />
            </div>

            <button
                type="submit"
                style={{
                    background: 'var(--color-primary)',
                    color: 'white',
                    padding: 'var(--spacing-sm) var(--spacing-xl)',
                    fontSize: '1.1rem',
                    fontWeight: 'bold',
                    fontFamily: 'var(--font-heading)',
                    textTransform: 'uppercase',
                    border: 'var(--brutalist-border)',
                    cursor: 'pointer',
                    boxShadow: '4px 4px 0px var(--color-text)',
                    height: '46px'
                }}
                onMouseDown={e => e.currentTarget.style.boxShadow = 'none'}
                onMouseUp={e => e.currentTarget.style.boxShadow = '4px 4px 0px var(--color-text)'}
            >
                Save Grind
            </button>
        </form >
    );
};
