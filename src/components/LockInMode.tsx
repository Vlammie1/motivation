import React, { useState, useEffect, useRef } from 'react';

interface LockInModeProps {
    isActive: boolean;
    onExit: () => void;
    mainGoal: string;
}

const HYPE_WORDS = [
    "ELIMINATE DISTRACTIONS", "STAY FOCUSED", "THE CLOCK IS TICKING",
    "YOU ARE CAPABLE", "THE GRIND NEVER STOPS", "BE UNSTOPPABLE",
    "FOCUS. EXECUTE. REPEAT.", "YOUR FUTURE SELF IS WATCHING",
    "DON'T FUCKING QUIT", "LOCK TF IN", "YOU HAVE THE POWER", "PROVE THEM WRONG",
    "ONE MORE REP", "EXECUTE ORDER", "PURE DISCIPLINE", "YOU CAN DO THIS", "YOU ARE NOT ALONE",
    "KEEP GOING", "PUSH HARDER", "NO FUCKING EXCUSES", "STAY HUNGRY", "MIND OVER MATTER",
    "EMBRACE THE STRUGGLE", "WORK IN SILENCE", "CHASE GREATNESS", "BEYOND LIMITS", "WIN THE DAY",
    "STAY CONSISTENT", "DISCIPLINE OVER MOTIVATION", "MAKE IT HAPPEN", "RISE AND GRIND", "FINISH STRONG",
    "NO RETREAT", "NO SURRENDER", "BE RELENTLESS", "OWN YOUR TIME", "STAY SHARP",
    "DO IT NOW", "BREAK THE CYCLE", "UNLEASH THE BEAST", "STAY DRIVEN", "OBSESSED WITH SUCCESS",
    "NEVER BACK DOWN", "SHOW UP", "OUTWORK EVERY FUCKING ONE", "STAY CRITICAL",
    "MASTER YOUR MIND", "BE THE EXCEPTION", "HARD WORK PAYS OFF", "CRUSH YOUR GOALS", "STAY HUMBLE",
    "BE FEARLESS", "PUSH THROUGH", "NO PAIN NO GAIN", "STAY ON TRACK", "BE THE BEST",
    "KEEP MOVING", "DON'T LOOK BACK", "STAY COMMITTED", "ONE STEP AT A TIME", "DO THE WORK",
    "BE PHENOMENAL", "STAY AMBITIOUS", "REACH HIGHER", "BE LEGENDARY"
];

const EMPOWERMENT_WORDS = [
    "YOU HAVE THE STRENGTH",
    "NOTHING CAN STOP YOU",
    "YOU ARE THE MASTER OF YOUR FATE",
    "CONQUER YOUR BOUNDARIES",
    "SUCCESS IS EARNED",
    "YOUR WILL IS UNBENDING",
    "YOU ARE THE ARCHITECT OF YOUR FUTURE",
    "BELIEVE IN YOUR POTENTIAL",
    "YOU ARE STRONGER THAN YOU THINK",
    "YOUR POTENTIAL IS LIMITLESS",
    "RISE ABOVE THE NOISE",
    "YOU OWN THIS MOMENT",
    "CLAIM YOUR VICTORY",
    "YOU ARE THE CAPTAIN OF YOUR SOUL",
    "TURN YOUR PAIN INTO POWER",
    "YOU WERE BORN TO WIN",
    "EVERY STEP COUNTS",
    "YOU ARE A FORCE OF NATURE",
    "TRUST THE PROCESS",
    "YOUR TIME IS NOW",
    "YOU ARE UNSTOPPABLE",
    "FOCUS ON THE VISION",
    "YOU HAVE WHAT IT TAKES",
    "BE THE LIGHT IN THE DARK",
    "YOU ARE DESTINED FOR GREATNESS"
];

export const LockInMode: React.FC<LockInModeProps> = ({ isActive, onExit, mainGoal }) => {
    const [hypeIndex, setHypeIndex] = useState(0);
    const [empowerIndex, setEmpowerIndex] = useState(0);
    const [userAudioUrl, setUserAudioUrl] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        if (isActive) {
            const hypeInterval = setInterval(() => {
                setHypeIndex(prev => (prev + 1) % HYPE_WORDS.length);
            }, 3500);

            const empowerInterval = setInterval(() => {
                setEmpowerIndex(prev => (prev + 1) % EMPOWERMENT_WORDS.length);
            }, 7000);

            // Audio Logic (Only for user-uploaded beats now, and it plays automatically when active)
            if (audioRef.current) {
                audioRef.current.load();
                audioRef.current.play().catch(e => console.warn("Playback failed:", e));
            }

            return () => {
                clearInterval(hypeInterval);
                clearInterval(empowerInterval);
            };
        }
    }, [isActive, userAudioUrl]);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (userAudioUrl) URL.revokeObjectURL(userAudioUrl);
            const url = URL.createObjectURL(file);
            setUserAudioUrl(url);
        }
    };

    if (!isActive) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'var(--color-bg)',
            color: 'var(--color-text)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 'var(--spacing-xl)',
            textAlign: 'center',
            overflow: 'hidden',
        }}>
            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'radial-gradient(circle, transparent 40%, rgba(0,0,0,0.4) 100%)',
                pointerEvents: 'none',
                zIndex: 1
            }} />

            {/* User can still upload a beat for Lock In mode if they want, but default is silent now */}
            <audio
                ref={audioRef}
                loop
                src={userAudioUrl || ""}
            />

            <div style={{ zIndex: 2 }}>
                <div style={{
                    fontFamily: 'var(--font-heading)',
                    fontSize: 'clamp(2rem, 5vw, 4rem)',
                    lineHeight: 1,
                    textTransform: 'uppercase',
                    marginBottom: 'var(--spacing-md)',
                    color: 'var(--color-primary)',
                    letterSpacing: '-1px'
                }}>
                    {mainGoal || "DO WHAT MUST BE DONE"}
                </div>

                <div style={{
                    fontFamily: 'var(--font-heading)',
                    fontSize: 'clamp(2.5rem, 10vw, 8rem)',
                    lineHeight: 0.9,
                    textTransform: 'uppercase',
                    marginBottom: 'var(--spacing-xl)',
                    color: 'var(--color-text)',
                    transition: 'all 0.5s ease-in-out'
                }}>
                    {HYPE_WORDS[hypeIndex]}
                </div>

                <div style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 'clamp(0.8rem, 2vw, 1.5rem)',
                    fontWeight: 'bold',
                    opacity: 0.8,
                    textTransform: 'uppercase',
                    letterSpacing: '3px',
                    height: '2rem'
                }}>
                    {EMPOWERMENT_WORDS[empowerIndex]}
                </div>
            </div>

            <div style={{
                position: 'absolute',
                bottom: 'var(--spacing-lg)',
                left: 'var(--spacing-lg)',
                zIndex: 10,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: 'var(--spacing-xs)'
            }}>
                <label style={{
                    padding: 'var(--spacing-xs) var(--spacing-sm)',
                    background: 'var(--color-text)',
                    color: 'var(--color-bg)',
                    fontWeight: 'bold',
                    border: 'var(--brutalist-border)',
                    cursor: 'pointer',
                    textTransform: 'uppercase',
                    fontSize: '0.7rem'
                }}>
                    {userAudioUrl ? 'TRACK LOADED' : 'UPLOAD LOCK-IN BEAT (.MP3)'}
                    <input
                        type="file"
                        accept="audio/mp3"
                        style={{ display: 'none' }}
                        onChange={handleFileUpload}
                    />
                </label>
            </div>

            <button
                onClick={onExit}
                style={{
                    position: 'absolute',
                    bottom: 'var(--spacing-lg)',
                    right: 'var(--spacing-lg)',
                    padding: 'var(--spacing-md) var(--spacing-lg)',
                    fontSize: '1.2rem',
                    backgroundColor: 'var(--color-primary)',
                    color: 'white',
                    border: 'var(--brutalist-border)',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-heading)',
                    zIndex: 10,
                    boxShadow: 'var(--brutalist-shadow)'
                }}
            >
                RETURN TO THE GRIND
            </button>
        </div>
    );
};
