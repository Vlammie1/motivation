import React, { useState } from 'react';

const HYPES = [
    "DO IT FOR THE PLOT.",
    "PAIN IS TEMPORARY. REGRET IS FOREVER.",
    "THEY SAID YOU COULDN'T.",
    "LOCK IN.",
    "BE UNAVOIDABLE.",
    "EXECUTE.",
    "DON'T STOP WHEN YOU'RE TIRED.",
    "SCARE THEM WITH YOUR SUCCESS.",
    "NO EXCUSES.",
    "PURE EFFORT.",
    "WIN THE DAY.",
    "STAY DANGEROUS.",
    "BE THE GLITCH IN THE SYSTEM.",
    "OBSESSION OVER TALENT.",
    "DISCIPLINE IS FREEDOM.",
    "EMBRACE THE GRIND.",
    "SILENCE THE DOUBT.",
    "MOVE MOUNTAINS.",
    "BE RELENTLESS.",
    "OUTWORK EVERYONE.",
    "PROVE THEM WRONG.",
    "MAKE IT HAPPEN.",
    "NO RETREAT.",
    "NO SURRENDER.",
    "STAY HUNGRY.",
    "CHASE GREATNESS.",
    "BE THE STORM.",
    "ACTION OVER WORDS.",
    "LIMITS ARE LIES.",
    "GRIT OVER GIFT.",
    "RISE AND GRIND.",
    "STAY FOCUSED.",
    "KEEP PUSHING.",
    "NEVER SETTLE.",
    "BE A WARRIOR.",
    "CONQUER FROM WITHIN.",
    "MASTER YOURSELF.",
    "DO THE WORK.",
    "SHUT UP AND TRAIN.",
    "RESULTS, NOT EXCUSES.",
    "BE UNSTOPPABLE.",
    "FUEL THE FIRE.",
    "DEFY THE ODDS.",
    "BECOME A LEGEND.",
    "OWN THE MOMENT.",
    "CRUSH YOUR GOALS.",
    "STAY CONSISTENT.",
    "THE ONLY WAY OUT IS THROUGH.",
    "TRANSFORM YOURSELF.",
    "BEYOND THE LIMIT.",
    "BREAK THE CYCLE.",
    "CREATE YOUR DESTINY.",
    "UNLEASH THE BEAST.",
    "FOCUS ON THE PRIZE.",
    "NEVER BACK DOWN.",
    "STRIVE FOR EXCELLENCE.",
    "LEAD THE PACK.",
    "DOMINATE THE DAY.",
    "MAKE YOUR MARK."
];

export const HypeButton: React.FC = () => {
    const [hype, setHype] = useState("SCARE THEM WITH YOUR SUCCESS.");

    const getHype = () => {
        const random = HYPES[Math.floor(Math.random() * HYPES.length)];
        setHype(random);
    };

    return (
        <button
            onClick={getHype}
            style={{
                width: '100%',
                padding: 'var(--spacing-lg)',
                background: 'var(--color-primary)',
                color: 'white',
                border: 'var(--brutalist-border)',
                boxShadow: 'var(--brutalist-shadow)',
                fontSize: '2.2rem', // Slightly larger
                fontFamily: 'var(--font-heading)',
                textTransform: 'uppercase',
                marginTop: '0px', // Tightened
                marginBottom: 'var(--spacing-lg)',
                transition: 'transform 0.1s',
            }}
        >
            {hype}
        </button>
    );
};
