import { useState } from 'react';
import { AlertTriangle, ArrowLeftRight, Check, Loader2, Trash2 } from 'lucide-react';
import { formatClock, formatHours, MS_PER_HOUR } from '../lib/time';

interface TimerConfirmModalProps {
    mode: 'stop' | 'switch';
    /** De timer liep zo lang dat je hem waarschijnlijk vergeten bent. */
    stale: boolean;
    projectName: string;
    projectColor: string;
    intent: string;
    elapsedMs: number;
    busy: boolean;
    onSave: (hours: number, note: string) => void;
    onCancel: () => void;
    onDiscard: () => void;
}

const QUICK_HOURS = [0.5, 1, 2, 3, 4];

export const TimerConfirmModal = ({
    mode,
    stale,
    projectName,
    projectColor,
    intent,
    elapsedMs,
    busy,
    onSave,
    onCancel,
    onDiscard
}: TimerConfirmModalProps) => {
    const measured = elapsedMs / MS_PER_HOUR;
    const [hours, setHours] = useState(Math.floor(measured));
    const [minutes, setMinutes] = useState(Math.round((measured % 1) * 60));
    const [note, setNote] = useState(intent);

    const total = hours + minutes / 60;
    const canSave = total > 0 && !!note.trim() && !busy;

    const applyQuick = (value: number) => {
        setHours(Math.floor(value));
        setMinutes(Math.round((value % 1) * 60));
    };

    const numberInput: React.CSSProperties = {
        width: '100%',
        padding: 'var(--spacing-sm)',
        border: 'var(--brutalist-border)',
        fontSize: '1.4rem',
        fontFamily: 'var(--font-heading)',
        textAlign: 'center',
        outline: 'none',
        background: 'var(--color-bg)',
        color: 'var(--color-text)',
        boxSizing: 'border-box'
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 10001,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--spacing-md)'
        }}>
            <div style={{
                background: 'var(--color-bg)',
                border: 'var(--brutalist-border)',
                boxShadow: '8px 8px 0px var(--color-text)',
                width: '100%', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto'
            }}>
                <div style={{
                    padding: 'var(--spacing-md) var(--spacing-lg)',
                    background: 'var(--color-text)', color: 'var(--color-bg)'
                }}>
                    <h2 style={{ margin: 0, fontFamily: 'var(--font-heading)', textTransform: 'uppercase', fontSize: '1.3rem' }}>
                        {mode === 'switch' ? 'Sessie afronden' : 'Klopt dit?'}
                    </h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', fontSize: '0.85rem' }}>
                        <div style={{
                            width: '10px', height: '10px', borderRadius: '2px',
                            background: projectColor, border: '2px solid currentColor', flexShrink: 0
                        }} />
                        <span style={{ fontWeight: 'bold' }}>{projectName}</span>
                    </div>
                </div>

                {stale && (
                    <div style={{
                        display: 'flex', gap: '10px', alignItems: 'flex-start',
                        padding: 'var(--spacing-md) var(--spacing-lg)',
                        background: 'var(--color-primary)', color: 'white'
                    }}>
                        <AlertTriangle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
                        <div style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>
                            De timer liep {formatClock(elapsedMs)}. Waarschijnlijk vergeten te stoppen —
                            hoeveel was er écht werk?
                        </div>
                    </div>
                )}

                <div style={{ padding: 'var(--spacing-lg)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
                            <label style={{ textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 'bold' }}>
                                Hoelang
                            </label>
                            <span style={{ fontSize: '0.75rem', opacity: 0.6 }}>
                                gemeten: {formatClock(elapsedMs)}
                            </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                            <div style={{ flex: 1 }}>
                                <input
                                    type="number"
                                    min="0"
                                    max="24"
                                    value={hours}
                                    onChange={e => setHours(Math.max(0, Math.min(24, Number(e.target.value) || 0)))}
                                    style={numberInput}
                                />
                                <div style={{ textAlign: 'center', fontSize: '0.7rem', opacity: 0.5, marginTop: '2px' }}>UREN</div>
                            </div>
                            <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', opacity: 0.4 }}>:</div>
                            <div style={{ flex: 1 }}>
                                <input
                                    type="number"
                                    min="0"
                                    max="59"
                                    value={minutes}
                                    onChange={e => setMinutes(Math.max(0, Math.min(59, Number(e.target.value) || 0)))}
                                    style={numberInput}
                                />
                                <div style={{ textAlign: 'center', fontSize: '0.7rem', opacity: 0.5, marginTop: '2px' }}>MINUTEN</div>
                            </div>
                        </div>

                        {stale && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: 'var(--spacing-sm)' }}>
                                {QUICK_HOURS.map(value => (
                                    <button
                                        key={value}
                                        onClick={() => applyQuick(value)}
                                        style={{
                                            padding: '4px 10px', border: '2px solid var(--color-text)',
                                            background: 'var(--color-bg)', color: 'var(--color-text)',
                                            fontFamily: 'var(--font-heading)', fontSize: '0.8rem', cursor: 'pointer'
                                        }}
                                    >
                                        {formatHours(value)}
                                    </button>
                                ))}
                                <button
                                    onClick={() => applyQuick(measured)}
                                    style={{
                                        padding: '4px 10px', border: '2px solid var(--color-text)',
                                        background: 'var(--color-text)', color: 'var(--color-bg)',
                                        fontFamily: 'var(--font-heading)', fontSize: '0.8rem', cursor: 'pointer'
                                    }}
                                >
                                    Alles
                                </button>
                            </div>
                        )}
                    </div>

                    <div>
                        <label
                            htmlFor="confirm-note"
                            style={{ display: 'block', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '6px' }}
                        >
                            Wat heb je gedaan?
                        </label>
                        <textarea
                            id="confirm-note"
                            value={note}
                            rows={3}
                            onChange={e => setNote(e.target.value.slice(0, 500))}
                            placeholder="Beschrijf kort wat er af is..."
                            style={{
                                width: '100%', padding: 'var(--spacing-sm)', border: 'var(--brutalist-border)',
                                fontSize: '0.95rem', fontFamily: 'var(--font-mono)', outline: 'none',
                                resize: 'vertical', background: 'var(--color-bg)', color: 'var(--color-text)',
                                boxSizing: 'border-box'
                            }}
                        />
                        <div style={{ fontSize: '0.7rem', opacity: 0.5, marginTop: '4px' }}>
                            Ingevuld met wat je van plan was. Pas aan als het anders liep.
                        </div>
                    </div>

                    <button
                        onClick={() => onSave(total, note)}
                        disabled={!canSave}
                        style={{
                            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                            background: 'var(--color-primary)', color: 'white',
                            padding: 'var(--spacing-md)', fontSize: '1.1rem',
                            fontFamily: 'var(--font-heading)', textTransform: 'uppercase',
                            border: 'var(--brutalist-border)', boxShadow: '4px 4px 0px var(--color-text)',
                            cursor: canSave ? 'pointer' : 'not-allowed', opacity: canSave ? 1 : 0.45
                        }}
                    >
                        {busy ? <Loader2 size={20} className="animate-spin" /> : mode === 'switch' ? <ArrowLeftRight size={20} /> : <Check size={20} />}
                        {mode === 'switch' ? `${formatHours(total)} opslaan & wisselen` : `${formatHours(total)} opslaan`}
                    </button>

                    <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                        <button
                            onClick={onCancel}
                            disabled={busy}
                            style={{
                                flex: 1, background: 'var(--color-bg)', color: 'var(--color-text)',
                                padding: 'var(--spacing-sm)', border: 'var(--brutalist-border)',
                                fontFamily: 'var(--font-heading)', textTransform: 'uppercase',
                                fontSize: '0.8rem', cursor: 'pointer'
                            }}
                        >
                            Terug naar timer
                        </button>
                        <button
                            onClick={() => {
                                if (confirm('Deze sessie weggooien zonder te loggen?')) onDiscard();
                            }}
                            disabled={busy}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '6px',
                                background: 'transparent', color: 'var(--color-text)',
                                padding: 'var(--spacing-sm) var(--spacing-md)', border: '2px solid rgba(128,128,128,0.4)',
                                fontFamily: 'var(--font-heading)', textTransform: 'uppercase',
                                fontSize: '0.8rem', cursor: 'pointer', opacity: 0.7
                            }}
                        >
                            <Trash2 size={14} />
                            Weggooien
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
