import React from 'react';

interface ProgressBarProps {
    current: number;
    total: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ current, total }) => {
    const percentage = total === 0 ? 0 : Math.round((current / total) * 100);

    return (
        <div style={{
            marginTop: 'var(--spacing-lg)',
            marginBottom: 'var(--spacing-xl)',
        }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontFamily: 'var(--font-heading)',
                fontSize: '1.2rem',
                marginBottom: 'var(--spacing-sm)'
            }}>
                <span>DISCIPLINE METER</span>
                <span style={{ color: 'var(--color-primary)' }}>{percentage}%</span>
            </div>

            <div style={{
                width: '100%',
                height: '60px',
                border: 'var(--brutalist-border)',
                background: 'var(--color-muted)',
                position: 'relative',
                boxShadow: 'inset 4px 4px 0px rgba(0,0,0,0.1)',
                overflow: 'hidden'
            }}>
                {/* Segmented Background */}
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    zIndex: 1,
                    pointerEvents: 'none'
                }}>
                    {[...Array(10)].map((_, i) => (
                        <div key={i} style={{
                            flex: 1,
                            borderRight: i < 9 ? '2px solid rgba(0,0,0,0.2)' : 'none'
                        }} />
                    ))}
                </div>

                <div style={{
                    width: `${percentage}%`,
                    height: '100%',
                    background: percentage === 100 ? 'var(--color-secondary)' : 'var(--color-primary)',
                    transition: 'width 0.6s cubic-bezier(0.65, 0, 0.35, 1)',
                    position: 'relative',
                    zIndex: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 'bold',
                    fontSize: '1.5rem',
                    fontFamily: 'var(--font-heading)',
                    boxShadow: '4px 0px 10px rgba(0,0,0,0.3)'
                }}>
                    {percentage > 15 && `${percentage}%`}
                </div>
            </div>
        </div>
    );
};
