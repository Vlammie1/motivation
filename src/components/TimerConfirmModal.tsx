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
        fontSize: 'var(--text-xl)',
        fontFamily: 'var(--font-heading)',
        textAlign: 'center',
        boxSizing: 'border-box'
    };

    return (
        <div className="modal-overlay" style={{ zIndex: 10001 }}>
            <div className="modal-panel" style={{ maxWidth: '460px', padding: 0 }}>
                <div style={{
                    padding: 'var(--spacing-md) var(--spacing-lg)',
                    borderBottom: '1px solid var(--color-border)'
                }}>
                    <h2 style={{ margin: 0, fontSize: 'var(--text-lg)' }}>
                        {mode === 'switch' ? 'Sessie afronden' : 'Klopt dit?'}
                    </h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', marginTop: 'var(--spacing-2xs)' }}>
                        <div style={{
                            width: '9px', height: '9px', borderRadius: 'var(--radius-full)',
                            background: projectColor, flexShrink: 0
                        }} />
                        <span className="muted" style={{ fontSize: 'var(--text-sm)' }}>{projectName}</span>
                    </div>
                </div>

                {stale && (
                    <div style={{
                        display: 'flex', gap: 'var(--spacing-xs)', alignItems: 'flex-start',
                        padding: 'var(--spacing-sm) var(--spacing-lg)',
                        background: 'rgba(255, 60, 0, 0.08)',
                        borderBottom: '1px solid var(--color-border)',
                        color: 'var(--color-primary)'
                    }}>
                        <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                        <div style={{ fontSize: 'var(--text-sm)' }}>
                            De timer liep {formatClock(elapsedMs)}. Waarschijnlijk vergeten te stoppen —
                            hoeveel was er écht werk?
                        </div>
                    </div>
                )}

                <div style={{ padding: 'var(--spacing-lg)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                            <label className="label">Hoelang</label>
                            <span className="muted" style={{ fontSize: 'var(--text-xs)' }}>
                                gemeten: {formatClock(elapsedMs)}
                            </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--spacing-xs)' }}>
                            <div style={{ flex: 1 }}>
                                <input
                                    type="number"
                                    min="0"
                                    max="24"
                                    aria-label="Uren"
                                    value={hours}
                                    onChange={e => setHours(Math.max(0, Math.min(24, Number(e.target.value) || 0)))}
                                    style={numberInput}
                                />
                                <div className="muted" style={{ textAlign: 'center', fontSize: 'var(--text-xs)', marginTop: 'var(--spacing-2xs)' }}>uren</div>
                            </div>
                            <div className="muted" style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-xl)', padding: 'var(--spacing-xs) 0' }}>:</div>
                            <div style={{ flex: 1 }}>
                                <input
                                    type="number"
                                    min="0"
                                    max="59"
                                    aria-label="Minuten"
                                    value={minutes}
                                    onChange={e => setMinutes(Math.max(0, Math.min(59, Number(e.target.value) || 0)))}
                                    style={numberInput}
                                />
                                <div className="muted" style={{ textAlign: 'center', fontSize: 'var(--text-xs)', marginTop: 'var(--spacing-2xs)' }}>minuten</div>
                            </div>
                        </div>

                        {stale && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-2xs)', marginTop: 'var(--spacing-sm)' }}>
                                {QUICK_HOURS.map(value => (
                                    <button
                                        key={value}
                                        onClick={() => applyQuick(value)}
                                        style={{
                                            padding: 'var(--spacing-2xs) var(--spacing-xs)',
                                            fontFamily: 'var(--font-heading)', fontSize: 'var(--text-xs)'
                                        }}
                                    >
                                        {formatHours(value)}
                                    </button>
                                ))}
                                <button
                                    onClick={() => applyQuick(measured)}
                                    style={{
                                        padding: 'var(--spacing-2xs) var(--spacing-xs)',
                                        background: 'var(--color-surface-2)',
                                        fontFamily: 'var(--font-heading)', fontSize: 'var(--text-xs)'
                                    }}
                                >
                                    Alles
                                </button>
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="label" htmlFor="confirm-note">
                            Wat heb je gedaan?
                        </label>
                        <textarea
                            id="confirm-note"
                            value={note}
                            rows={3}
                            onChange={e => setNote(e.target.value.slice(0, 500))}
                            placeholder="Beschrijf kort wat er af is..."
                            style={{
                                width: '100%',
                                resize: 'vertical',
                                boxSizing: 'border-box'
                            }}
                        />
                        <div className="muted" style={{ fontSize: 'var(--text-xs)', marginTop: 'var(--spacing-2xs)' }}>
                            Ingevuld met wat je van plan was. Pas aan als het anders liep.
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
                        <button
                            onClick={() => onSave(total, note)}
                            disabled={!canSave}
                            className="btn-primary"
                            style={{
                                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                gap: 'var(--spacing-xs)', padding: 'var(--spacing-sm)'
                            }}
                        >
                            {busy ? <Loader2 size={17} className="animate-spin" /> : mode === 'switch' ? <ArrowLeftRight size={17} /> : <Check size={17} />}
                            {mode === 'switch' ? `${formatHours(total)} opslaan & wisselen` : `${formatHours(total)} opslaan`}
                        </button>

                        <div style={{ display: 'flex', gap: 'var(--spacing-xs)' }}>
                            <button
                                onClick={onCancel}
                                disabled={busy}
                                style={{ flex: 1, padding: 'var(--spacing-xs)', fontSize: 'var(--text-sm)' }}
                            >
                                Terug naar timer
                            </button>
                            <button
                                onClick={() => {
                                    if (confirm('Deze sessie weggooien zonder te loggen?')) onDiscard();
                                }}
                                disabled={busy}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 'var(--spacing-2xs)',
                                    background: 'transparent', color: 'var(--color-text-muted)',
                                    padding: 'var(--spacing-xs) var(--spacing-sm)',
                                    fontSize: 'var(--text-sm)'
                                }}
                            >
                                <Trash2 size={14} />
                                Weggooien
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
