import React from 'react';
import { useTheme } from '../context/ThemeContext';

const THEMES = [
    { id: 'light', name: 'PURE' },
    { id: 'dark', name: 'VOID' },
    { id: 'hazard', name: 'HAZARD' },
    { id: 'cyber', name: 'CYBER' },
] as const;

export const ThemeSwitcher: React.FC = () => {
    const { theme, setTheme } = useTheme();

    return (
        <div style={{
            display: 'flex',
            gap: 'var(--spacing-sm)',
            marginBottom: 'var(--spacing-lg)',
            flexWrap: 'wrap'
        }}>
            {THEMES.map((t) => (
                <button
                    key={t.id}
                    onClick={() => setTheme(t.id)}
                    style={{
                        padding: 'var(--spacing-sm) var(--spacing-md)',
                        background: theme === t.id ? 'var(--color-primary)' : 'var(--color-bg)',
                        color: theme === t.id ? 'white' : 'var(--color-text)',
                        fontSize: '0.8rem',
                        fontWeight: 'bold',
                        border: 'var(--brutalist-border)',
                        boxShadow: theme === t.id ? 'none' : 'var(--brutalist-shadow)',
                        transform: theme === t.id ? 'translate(2px, 2px)' : 'none',
                    }}
                >
                    {t.name}
                </button>
            ))}
        </div>
    );
};
