import React from 'react';

interface VictoryOverlayProps {
    isVisible: boolean;
    onClose: () => void;
}

export const VictoryOverlay: React.FC<VictoryOverlayProps> = ({ isVisible, onClose }) => {
    if (!isVisible) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'var(--color-secondary)',
            color: 'black',
            zIndex: 10000,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 'var(--spacing-xl)',
            textAlign: 'center',
            animation: 'slide-up 0.5s cubic-bezier(0.87, 0, 0.13, 1)'
        }}>
            <div style={{
                fontFamily: 'var(--font-heading)',
                fontSize: 'clamp(4rem, 15vw, 15rem)',
                lineHeight: 0.8,
                marginBottom: 'var(--spacing-md)'
            }}>
                TASK<br />CLEARED
            </div>

            <div style={{
                fontFamily: 'var(--font-body)',
                fontSize: '1.5rem',
                fontWeight: 'bold',
                marginBottom: 'var(--spacing-xl)',
                textTransform: 'uppercase'
            }}>
                Silence the doubt. You did the work.
            </div>

            <button
                onClick={onClose}
                style={{
                    padding: 'var(--spacing-md) var(--spacing-xl)',
                    fontSize: '1.2rem',
                    background: 'black',
                    color: 'white',
                    border: 'var(--brutalist-border)',
                    fontFamily: 'var(--font-heading)',
                    cursor: 'pointer'
                }}
            >
                AND I'M NOT DONE YET
            </button>

            <style>{`
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
        </div>
    );
};
