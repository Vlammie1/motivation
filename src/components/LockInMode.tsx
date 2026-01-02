import React, { useState, useEffect, useRef } from 'react';
import { useSupabaseLockIn } from '../hooks/useSupabaseLockIn';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

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

const DEFAULT_BEAT_URL = "https://kfatexkqwhqbiavyvwxe.supabase.co/storage/v1/object/sign/Lock%20in%20beat/Lock%20in%20beat/inspiring-motivation-sport-456639.mp3?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV84MzFhNjZkYi1lM2Y3LTQxMDgtYWIyMy1iOGQxZGI3ZTM3YTQiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJMb2NrIGluIGJlYXQvTG9jayBpbiBiZWF0L2luc3BpcmluZy1tb3RpdmF0aW9uLXNwb3J0LTQ1NjYzOS5tcDMiLCJpYXQiOjE3NjczODQ3ODEsImV4cCI6NDg4OTQ0ODc4MX0.igQ0VOSwHRNrQxFlgE4T-WqMcFI-J1GGWb6Dnhf4BN4";

export const LockInMode: React.FC<LockInModeProps> = ({ isActive, onExit, mainGoal }) => {
    const { startSession, endSession } = useSupabaseLockIn();
    const { user } = useAuth();
    const [hypeIndex, setHypeIndex] = useState(0);
    const [empowerIndex, setEmpowerIndex] = useState(0);
    const [userAudioUrl, setUserAudioUrl] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [idleTime, setIdleTime] = useState(0);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const lastActivityRef = useRef<number>(Date.now());

    // Load saved beat from localStorage on mount
    useEffect(() => {
        const savedBeat = localStorage.getItem('lock_in_beat_url');
        if (savedBeat) {
            setUserAudioUrl(savedBeat);
        } else {
            setUserAudioUrl(DEFAULT_BEAT_URL);
        }
    }, []);

    useEffect(() => {
        if (isActive) {
            const initSession = async () => {
                const session = await startSession();
                if (session) setSessionId(session.id);
            };
            initSession();

            const hypeInterval = setInterval(() => {
                setHypeIndex(Math.floor(Math.random() * HYPE_WORDS.length));
            }, 3500);

            const empowerInterval = setInterval(() => {
                setEmpowerIndex(Math.floor(Math.random() * EMPOWERMENT_WORDS.length));
            }, 7000);

            const idleInterval = setInterval(() => {
                const now = Date.now();
                if (now - lastActivityRef.current > 1000) {
                    setIdleTime(prev => prev + 1);
                }
            }, 1000);

            const activityHandler = () => {
                lastActivityRef.current = Date.now();
            };

            window.addEventListener('mousemove', activityHandler);
            window.addEventListener('keydown', activityHandler);

            if (audioRef.current) {
                audioRef.current.load();
                audioRef.current.play().catch(e => console.warn("Playback failed:", e));
            }

            return () => {
                clearInterval(hypeInterval);
                clearInterval(empowerInterval);
                clearInterval(idleInterval);
                window.removeEventListener('mousemove', activityHandler);
                window.removeEventListener('keydown', activityHandler);
            };
        }
    }, [isActive, userAudioUrl]);

    const handleExit = async () => {
        if (sessionId) {
            await endSession(sessionId, idleTime);
        }
        onExit();
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;

        setUploading(true);
        try {
            // Upload to Supabase Storage
            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}-${Math.random()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { data, error } = await supabase.storage
                .from('Lock in beat')
                .upload(filePath, file);

            if (error) {
                throw error;
            }

            // Get public URL (assuming bucket is public)
            const { data: { publicUrl } } = supabase.storage
                .from('Lock in beat')
                .getPublicUrl(filePath);

            setUserAudioUrl(publicUrl);
            localStorage.setItem('lock_in_beat_url', publicUrl); // Persist
            alert('Beat uploaded & saved successfully!');

        } catch (error: any) {
            console.error('Error uploading beat:', error);
            alert('Failed to upload beat: ' + error.message);
        } finally {
            setUploading(false);
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

            <audio ref={audioRef} loop src={userAudioUrl || DEFAULT_BEAT_URL} />

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

                {idleTime > 10 && (
                    <div style={{ color: '#ef4444', fontWeight: 'bold', marginTop: 'var(--spacing-md)', textTransform: 'uppercase' }}>
                        IDLE ALERT: {idleTime}s WASTED. GET BACK TO IT.
                    </div>
                )}
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
                    cursor: uploading ? 'wait' : 'pointer',
                    textTransform: 'uppercase',
                    fontSize: '0.7rem',
                    boxShadow: '4px 4px 0px var(--color-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                }}>
                    {uploading ? (
                        <>
                            <Loader2 className="animate-spin" size={14} />
                            UPLOADING...
                        </>
                    ) : (
                        userAudioUrl && userAudioUrl !== DEFAULT_BEAT_URL ? 'CUSTOM BEAT ACTIVE (CHANGE?)' : 'UPLOAD LOCK-IN BEAT (.MP3)'
                    )}
                    <input
                        type="file"
                        accept="audio/mp3"
                        style={{ display: 'none' }}
                        onChange={handleFileUpload}
                        disabled={uploading}
                    />
                </label>
                {userAudioUrl !== DEFAULT_BEAT_URL && (
                    <button
                        onClick={() => {
                            localStorage.removeItem('lock_in_beat_url');
                            setUserAudioUrl(DEFAULT_BEAT_URL);
                        }}
                        style={{
                            fontSize: '0.6rem',
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--color-text)',
                            textDecoration: 'underline',
                            cursor: 'pointer'
                        }}
                    >
                        RESET TO DEFAULT BEAT
                    </button>
                )}
            </div>

            <button
                onClick={handleExit}
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
