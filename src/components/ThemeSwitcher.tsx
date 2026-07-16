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
        <div
            role="group"
            aria-label="Thema"
            style={{
                display: 'flex',
                gap: '2px',
                padding: '2px',
                background: 'var(--color-muted)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
            }}
        >
            {THEMES.map((t) => {
                const isActive = theme === t.id;
                return (
                    <button
                        key={t.id}
                        onClick={() => setTheme(t.id)}
                        aria-pressed={isActive}
                        style={{
                            padding: 'var(--spacing-2xs) var(--spacing-xs)',
                            background: isActive ? 'var(--color-bg)' : 'transparent',
                            color: isActive ? 'var(--color-text)' : 'var(--color-text-muted)',
                            fontSize: 'var(--text-xs)',
                            fontWeight: 600,
                            letterSpacing: '0.04em',
                            border: '1px solid transparent',
                            borderRadius: 'var(--radius-sm)',
                            boxShadow: isActive ? 'var(--shadow-xs)' : 'none',
                        }}
                    >
                        {t.name}
                    </button>
                );
            })}
        </div>
    );
};
