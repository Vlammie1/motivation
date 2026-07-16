import React, { useState, useEffect, useRef } from 'react';
import { Minimize2, Volume2, VolumeX, ArrowLeftRight, Square, Loader2 } from 'lucide-react';

import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { formatClock } from '../lib/time';

interface FocusModeProps {
    projectName: string;
    projectColor: string;
    intent: string;
    elapsedMs: number;
    soundEnabled: boolean;
    onToggleSound: (enabled: boolean) => void;
    onSwitchProject: () => void;
    onStop: () => void;
    onMinimize: () => void;
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
    "YOU HAVE THE STRENGTH", "NOTHING CAN STOP YOU", "YOU ARE THE MASTER OF YOUR FATE",
    "CONQUER YOUR BOUNDARIES", "SUCCESS IS EARNED", "YOUR WILL IS UNBENDING",
    "YOU ARE THE ARCHITECT OF YOUR FUTURE", "BELIEVE IN YOUR POTENTIAL",
    "YOU ARE STRONGER THAN YOU THINK", "YOUR POTENTIAL IS LIMITLESS",
    "RISE ABOVE THE NOISE", "YOU OWN THIS MOMENT", "CLAIM YOUR VICTORY",
    "YOU ARE THE CAPTAIN OF YOUR SOUL", "TURN YOUR PAIN INTO POWER",
    "YOU WERE BORN TO WIN", "EVERY STEP COUNTS", "YOU ARE A FORCE OF NATURE",
    "TRUST THE PROCESS", "YOUR TIME IS NOW", "YOU ARE UNSTOPPABLE",
    "FOCUS ON THE VISION", "YOU HAVE WHAT IT TAKES", "BE THE LIGHT IN THE DARK",
    "YOU ARE DESTINED FOR GREATNESS"
];

const DEFAULT_BEAT_URL = "https://kfatexkqwhqbiavyvwxe.supabase.co/storage/v1/object/sign/Lock%20in%20beat/Lock%20in%20beat/inspiring-motivation-sport-456639.mp3?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV84MzFhNjZkYi1lM2Y3LTQxMDgtYWIyMy1iOGQxZGI3ZTM3YTQiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJMb2NrIGluIGJlYXQvTG9jayBpbiBiZWF0L2luc3BpcmluZy1tb3RpdmF0aW9uLXNwb3J0LTQ1NjYzOS5tcDMiLCJpYXQiOjE3NjczODQ3ODEsImV4cCI6NDg4OTQ0ODc4MX0.igQ0VOSwHRNrQxFlgE4T-WqMcFI-J1GGWb6Dnhf4BN4";

export const FocusMode: React.FC<FocusModeProps> = ({
    projectName,
    projectColor,
    intent,
    elapsedMs,
    soundEnabled,
    onToggleSound,
    onSwitchProject,
    onStop,
    onMinimize
}) => {
    const { user } = useAuth();
    const [hypeIndex, setHypeIndex] = useState(0);
    const [empowerIndex, setEmpowerIndex] = useState(0);
    const [beatUrl, setBeatUrl] = useState<string>(() => localStorage.getItem('lock_in_beat_url') || DEFAULT_BEAT_URL);
    const [uploading, setUploading] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        const hypeInterval = setInterval(() => setHypeIndex(Math.floor(Math.random() * HYPE_WORDS.length)), 3500);
        const empowerInterval = setInterval(() => setEmpowerIndex(Math.floor(Math.random() * EMPOWERMENT_WORDS.length)), 7000);

        return () => {
            clearInterval(hypeInterval);
            clearInterval(empowerInterval);
        };
    }, []);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        if (soundEnabled) {
            audio.play().catch(e => console.warn('Playback failed:', e));
        } else {
            audio.pause();
        }
    }, [soundEnabled, beatUrl]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;

        setUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const filePath = `${user.id}-${Date.now()}.${fileExt}`;

            const { error } = await supabase.storage.from('Lock in beat').upload(filePath, file);
            if (error) throw error;

            const { data: { publicUrl } } = supabase.storage.from('Lock in beat').getPublicUrl(filePath);
            setBeatUrl(publicUrl);
            localStorage.setItem('lock_in_beat_url', publicUrl);
        } catch (error: any) {
            console.error('Error uploading beat:', error);
            alert('Beat uploaden mislukt: ' + error.message);
        } finally {
            setUploading(false);
        }
    };

    const cornerButton: React.CSSProperties = {
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: 'var(--spacing-sm) var(--spacing-md)',
        background: 'var(--color-bg)', color: 'var(--color-text)',
        border: 'var(--brutalist-border)', cursor: 'pointer',
        fontFamily: 'var(--font-heading)', textTransform: 'uppercase', fontSize: '0.8rem'
    };

    return (
        <div style={{
            position: 'fixed', inset: 0,
            backgroundColor: 'var(--color-bg)', color: 'var(--color-text)',
            zIndex: 9999,
            display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
            padding: 'var(--spacing-xl)', textAlign: 'center', overflow: 'hidden'
        }}>
            <div style={{
                position: 'absolute', inset: 0,
                background: 'radial-gradient(circle, transparent 40%, rgba(0,0,0,0.4) 100%)',
                pointerEvents: 'none', zIndex: 1
            }} />

            <audio ref={audioRef} loop src={beatUrl} />

            <div style={{ zIndex: 2, maxWidth: '100%' }}>
                {/* Waar je aan werkt — vervangt het oude vaste doel. */}
                <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: '12px',
                    padding: 'var(--spacing-sm) var(--spacing-lg)',
                    border: `4px solid ${projectColor}`,
                    marginBottom: 'var(--spacing-md)'
                }}>
                    <div style={{ width: '14px', height: '14px', borderRadius: '2px', background: projectColor, flexShrink: 0 }} />
                    <span style={{
                        fontFamily: 'var(--font-heading)',
                        fontSize: 'clamp(1.2rem, 3vw, 2.2rem)',
                        textTransform: 'uppercase', letterSpacing: '-0.5px', lineHeight: 1
                    }}>
                        {projectName}
                    </span>
                </div>

                <div style={{
                    fontSize: 'clamp(0.9rem, 2vw, 1.3rem)', fontWeight: 'bold',
                    opacity: 0.75, marginBottom: 'var(--spacing-lg)',
                    maxWidth: '700px', marginLeft: 'auto', marginRight: 'auto'
                }}>
                    {intent}
                </div>

                <div style={{
                    fontFamily: 'var(--font-heading)',
                    fontSize: 'clamp(3rem, 12vw, 9rem)',
                    lineHeight: 0.9, color: projectColor,
                    letterSpacing: '-2px', marginBottom: 'var(--spacing-lg)',
                    fontVariantNumeric: 'tabular-nums'
                }}>
                    {formatClock(elapsedMs)}
                </div>

                <div style={{
                    fontFamily: 'var(--font-heading)',
                    fontSize: 'clamp(1.5rem, 5vw, 3.5rem)',
                    lineHeight: 0.95, textTransform: 'uppercase',
                    marginBottom: 'var(--spacing-md)',
                    transition: 'all 0.5s ease-in-out'
                }}>
                    {HYPE_WORDS[hypeIndex]}
                </div>

                <div style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 'clamp(0.7rem, 1.5vw, 1.1rem)',
                    fontWeight: 'bold', opacity: 0.7,
                    textTransform: 'uppercase', letterSpacing: '3px', height: '1.6rem'
                }}>
                    {EMPOWERMENT_WORDS[empowerIndex]}
                </div>
            </div>

            {/* Linksboven: geluid */}
            <div style={{
                position: 'absolute', top: 'var(--spacing-lg)', left: 'var(--spacing-lg)',
                zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 'var(--spacing-xs)'
            }}>
                <button onClick={() => onToggleSound(!soundEnabled)} style={cornerButton}>
                    {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                    {soundEnabled ? 'Geluid aan' : 'Geluid uit'}
                </button>

                <label style={{
                    fontSize: '0.6rem', opacity: 0.6, cursor: uploading ? 'wait' : 'pointer',
                    textDecoration: 'underline', display: 'flex', alignItems: 'center', gap: '4px'
                }}>
                    {uploading ? <><Loader2 className="animate-spin" size={10} /> UPLOADEN...</> : 'EIGEN BEAT UPLOADEN (.MP3)'}
                    <input type="file" accept="audio/mp3" style={{ display: 'none' }} onChange={handleFileUpload} disabled={uploading} />
                </label>
                {beatUrl !== DEFAULT_BEAT_URL && (
                    <button
                        onClick={() => {
                            localStorage.removeItem('lock_in_beat_url');
                            setBeatUrl(DEFAULT_BEAT_URL);
                        }}
                        style={{ fontSize: '0.6rem', background: 'transparent', border: 'none', color: 'var(--color-text)', textDecoration: 'underline', cursor: 'pointer', opacity: 0.6, padding: 0 }}
                    >
                        TERUG NAAR STANDAARD BEAT
                    </button>
                )}
            </div>

            {/* Rechtsboven: wegklappen */}
            <button
                onClick={onMinimize}
                style={{ ...cornerButton, position: 'absolute', top: 'var(--spacing-lg)', right: 'var(--spacing-lg)', zIndex: 10 }}
            >
                <Minimize2 size={16} />
                Klap in
            </button>

            {/* Onderaan: de twee acties die er echt toe doen */}
            <div style={{
                position: 'absolute', bottom: 'var(--spacing-lg)', right: 'var(--spacing-lg)',
                zIndex: 10, display: 'flex', gap: 'var(--spacing-md)', flexWrap: 'wrap', justifyContent: 'flex-end'
            }}>
                <button
                    onClick={onSwitchProject}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        padding: 'var(--spacing-md) var(--spacing-lg)',
                        background: 'var(--color-bg)', color: 'var(--color-text)',
                        border: 'var(--brutalist-border)', boxShadow: 'var(--brutalist-shadow)',
                        cursor: 'pointer', fontFamily: 'var(--font-heading)',
                        textTransform: 'uppercase', fontSize: '1rem'
                    }}
                >
                    <ArrowLeftRight size={18} />
                    Ander project
                </button>
                <button
                    onClick={onStop}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        padding: 'var(--spacing-md) var(--spacing-xl)',
                        backgroundColor: 'var(--color-primary)', color: 'white',
                        border: 'var(--brutalist-border)', boxShadow: 'var(--brutalist-shadow)',
                        cursor: 'pointer', fontFamily: 'var(--font-heading)',
                        textTransform: 'uppercase', fontSize: '1.2rem'
                    }}
                >
                    <Square size={18} fill="white" />
                    Stop
                </button>
            </div>
        </div>
    );
};
