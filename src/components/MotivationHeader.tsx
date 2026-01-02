import React from 'react';
import useLocalStorage from '../hooks/useLocalStorage';

export const MotivationHeader: React.FC = () => {
    const [goal, setGoal] = useLocalStorage<string>('brutalist-main-goal', '');
    const [isEditing, setIsEditing] = React.useState(false);

    return (
        <div style={{ marginBottom: 'var(--spacing-md)' }}> {/* Reduced from xl */}
            <div style={{
                fontFamily: 'var(--font-body)',
                fontSize: '0.9rem',
                fontWeight: 'bold',
                marginBottom: '4px',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                opacity: 0.7
            }}>
                Current Objective:
            </div>

            {isEditing ? (
                <input
                    autoFocus
                    value={goal}
                    onChange={(e) => setGoal(e.target.value)}
                    onBlur={() => setIsEditing(false)}
                    onKeyDown={(e) => e.key === 'Enter' && setIsEditing(false)}
                    style={{
                        width: '100%',
                        fontSize: '2.5rem',
                        fontFamily: 'var(--font-heading)',
                        textTransform: 'uppercase',
                        border: 'none',
                        borderBottom: 'var(--brutalist-border)',
                        outline: 'none',
                        background: 'transparent',
                        boxShadow: 'none'
                    }}
                    placeholder="ENTER YOUR MISSION"
                />
            ) : (
                <h1
                    onClick={() => setIsEditing(true)}
                    style={{
                        fontSize: '2.5rem',
                        fontFamily: 'var(--font-heading)',
                        textTransform: 'uppercase',
                        borderBottom: 'var(--brutalist-border)',
                        cursor: 'text',
                        lineHeight: '1.2',
                        minHeight: '3rem'
                    }}
                >
                    {goal || "CLICK TO SET YOUR MISSION"}
                </h1>
            )}
        </div>
    );
};
