import React, { useState, useEffect } from 'react';

interface ShameClockProps {
    lastCompletionTime: number | null;
}

const MESSAGES = [
    { threshold: 0, text: "THE CLOCK IS TICKING..." },
    { threshold: 60, text: "A MINUTE WASTED. PURE WEAKNESS." },
    { threshold: 120, text: "TWO MINUTES OF NOTHING. DO SOMETHING." },
    { threshold: 300, text: "FIVE MINUTES. YOU'RE SLACKING OFF." },
    { threshold: 600, text: "TEN MINUTES? DISGRACEFUL." },
    { threshold: 1200, text: "TWENTY MINUTES. ARE YOU EVEN TRYING?" },
    { threshold: 1800, text: "HALF AN HOUR GONE. ABSOLUTELY PATHETIC." },
    { threshold: 3600, text: "AN HOUR OF INACTIVITY. SHAMEFUL." },
    { threshold: 7200, text: "TWO HOURS. YOU CAN DO BETTER." },
    { threshold: 14400, text: "FOUR HOURS. YOU'RE DOING IT WRONG." },
    { threshold: 28800, text: "EIGHT HOURS. ARE YOU DOING FUCKING ANYTHING?" },
    { threshold: 43200, text: "TWELVE HOURS. FUCKING LOSER." },
    { threshold: 86400, text: "ONE DAY. THAT'S 0,003% OF YOUR FUCKING LIFE." },
    { threshold: 172800, text: "TWO DAYS. YOU'RE NOT MAKING IT THIS WAY." },
    { threshold: 259200, text: "THREE DAYS. ALMOST 0,01% OF YOUR FUCKING LIFE." },
    { threshold: 604800, text: "ONE WEEK. ARE YOU THERE?" },
    { threshold: 1209600, text: "TWO WEEKS. LAZY FUCKER." },
    { threshold: 2419200, text: "THREE WEEKS. OUTWORK THEM YOU SLOW FUCK." },
    { threshold: 4838400, text: "ONE MONTH. YOU'RE NEVER WINNING AT THIS PACE." },
];

export const ShameClock: React.FC<ShameClockProps> = ({ lastCompletionTime }) => {
    const [elapsed, setElapsed] = useState(0);

    useEffect(() => {
        if (!lastCompletionTime) return;

        const updateElapsed = () => {
            const now = Date.now();
            setElapsed(Math.floor((now - lastCompletionTime) / 1000));
        };

        updateElapsed();
        const interval = setInterval(updateElapsed, 1000);

        return () => clearInterval(interval);
    }, [lastCompletionTime]);

    if (!lastCompletionTime) return null;

    const currentMessage = MESSAGES.reduce((prev, curr) => {
        if (elapsed >= curr.threshold) return curr;
        return prev;
    }).text;

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div style={{
            border: 'var(--brutalist-border)',
            padding: 'var(--spacing-md)',
            background: 'var(--color-bg)',
            boxShadow: 'var(--brutalist-shadow)',
            marginBottom: 'var(--spacing-lg)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 'var(--spacing-xs)',
            position: 'relative',
            overflow: 'hidden'
        }}>
            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '4px',
                background: 'var(--color-primary)',
                animation: 'pulse 1s infinite alternate'
            }} />

            <span style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '0.8rem',
                letterSpacing: '2px',
                fontWeight: 'bold',
                opacity: 0.7
            }}>
                IDLE TIME DETECTED
            </span>

            <div style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '3rem',
                lineHeight: 1,
                color: 'var(--color-primary)',
                textShadow: '2px 2px 0px var(--color-text)'
            }}>
                {formatTime(elapsed)}
            </div>

            <div style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '1.2rem',
                textAlign: 'center',
                textTransform: 'uppercase',
                maxWidth: '300px',
                marginTop: 'var(--spacing-xs)'
            }}>
                {currentMessage}
            </div>

            <style>
                {`
                @keyframes pulse {
                    from { opacity: 0.3; }
                    to { opacity: 1; }
                }
                `}
            </style>
        </div>
    );
};
