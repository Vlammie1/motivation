import { useEffect, useMemo, useRef, useState } from 'react';
import { Play, Plus, Search, X, Loader2 } from 'lucide-react';
import { useProjects } from '../context/ProjectsContext';
import type { ProjectStats } from '../hooks/useSupabaseProjects';
import { PROJECT_COLORS, DEFAULT_PROJECT_COLOR } from '../lib/projectColors';
import { formatHours } from '../lib/time';

interface TimerStartModalProps {
    onClose: () => void;
    onStart: (projectId: string, intent: string) => Promise<void>;
    busy: boolean;
    /** Gezet bij het wisselen van project: de vorige sessie is net opgeslagen. */
    switchedFrom?: string | null;
    /** Voorgeselecteerd project, bijv. bij starten vanaf een projectkaart. */
    initialProjectId?: string;
}

const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: 'var(--spacing-sm)',
    border: 'var(--brutalist-border)',
    fontSize: '0.95rem',
    fontFamily: 'var(--font-mono)',
    outline: 'none',
    background: 'var(--color-bg)',
    color: 'var(--color-text)',
    boxSizing: 'border-box'
};

export const TimerStartModal = ({ onClose, onStart, busy, switchedFrom, initialProjectId }: TimerStartModalProps) => {
    const { addProject, getProjectStats } = useProjects();
    const [stats, setStats] = useState<ProjectStats[]>([]);
    const [loading, setLoading] = useState(true);
    const [query, setQuery] = useState('');
    const [selectedId, setSelectedId] = useState<string | null>(initialProjectId ?? null);
    const [intent, setIntent] = useState('');
    const [showNew, setShowNew] = useState(false);
    const [newName, setNewName] = useState('');
    const [newColor, setNewColor] = useState(DEFAULT_PROJECT_COLOR);
    const intentRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        let cancelled = false;
        getProjectStats().then(data => {
            if (cancelled) return;
            setStats(data);
            setLoading(false);
        });
        return () => { cancelled = true; };
    }, [getProjectStats]);

    // Komt het project al mee, dan is "wat ga je doen?" het enige dat nog mist.
    useEffect(() => {
        if (initialProjectId) intentRef.current?.focus();
    }, [initialProjectId]);

    // Waar je het laatst aan werkte staat bovenaan — dat is bijna altijd
    // waar je zo weer aan gaat werken.
    const ranked = useMemo(() => {
        const active = stats.filter(p => !p.archived);
        const sorted = [...active].sort((a, b) => {
            if (a.last_worked && b.last_worked && a.last_worked !== b.last_worked) {
                return a.last_worked > b.last_worked ? -1 : 1;
            }
            if (a.last_worked && !b.last_worked) return -1;
            if (!a.last_worked && b.last_worked) return 1;
            return b.total_hours - a.total_hours;
        });
        const q = query.trim().toLowerCase();
        return q ? sorted.filter(p => p.name.toLowerCase().includes(q)) : sorted;
    }, [stats, query]);

    const selected = ranked.find(p => p.id === selectedId) || stats.find(p => p.id === selectedId) || null;

    const handleCreate = async () => {
        const name = newName.trim();
        if (!name) return;
        const created = await addProject(name, newColor);
        if (!created) return;
        setStats(prev => [
            ...prev,
            { ...created, total_hours: 0, sessions: 0, hours_last_7: 0, hours_last_30: 0, avg_session: 0, last_worked: null }
        ]);
        setSelectedId(created.id);
        setShowNew(false);
        setNewName('');
        setQuery('');
        intentRef.current?.focus();
    };

    const canStart = !!selectedId && !!intent.trim() && !busy;

    const handleStart = () => {
        if (!canStart || !selectedId) return;
        onStart(selectedId, intent);
    };

    return (
        <div
            style={{
                position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 10000,
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--spacing-md)'
            }}
            onClick={onClose}
        >
            <div
                style={{
                    background: 'var(--color-bg)',
                    border: 'var(--brutalist-border)',
                    boxShadow: '8px 8px 0px var(--color-text)',
                    width: '100%', maxWidth: '520px', maxHeight: '90vh',
                    display: 'flex', flexDirection: 'column'
                }}
                onClick={e => e.stopPropagation()}
            >
                <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: 'var(--spacing-md) var(--spacing-lg)',
                    background: 'var(--color-text)', color: 'var(--color-bg)'
                }}>
                    <h2 style={{ margin: 0, fontFamily: 'var(--font-heading)', textTransform: 'uppercase', fontSize: '1.3rem' }}>
                        {switchedFrom ? 'Volgend project' : 'Start timer'}
                    </h2>
                    <button
                        onClick={onClose}
                        style={{ background: 'transparent', border: 'none', color: 'var(--color-bg)', cursor: 'pointer', padding: 0 }}
                    >
                        <X size={22} />
                    </button>
                </div>

                {switchedFrom && (
                    <div style={{
                        padding: 'var(--spacing-sm) var(--spacing-lg)',
                        background: 'var(--color-primary)', color: 'white',
                        fontWeight: 'bold', fontSize: '0.8rem', textTransform: 'uppercase'
                    }}>
                        ✓ Sessie op {switchedFrom} opgeslagen
                    </div>
                )}

                <div style={{ padding: 'var(--spacing-lg)', overflowY: 'auto', flex: 1 }}>
                    <label style={{ display: 'block', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '6px' }}>
                        Waar ga je aan werken?
                    </label>

                    <div style={{ position: 'relative', marginBottom: 'var(--spacing-sm)' }}>
                        <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} />
                        <input
                            type="text"
                            value={query}
                            autoFocus={!initialProjectId}
                            onChange={e => setQuery(e.target.value)}
                            placeholder="Zoek project..."
                            style={{ ...inputStyle, paddingLeft: '34px' }}
                        />
                    </div>

                    <div style={{
                        border: '2px solid rgba(128,128,128,0.3)',
                        maxHeight: '210px', overflowY: 'auto',
                        display: 'flex', flexDirection: 'column'
                    }}>
                        {loading ? (
                            <div style={{ padding: 'var(--spacing-md)', opacity: 0.5, fontWeight: 'bold', fontSize: '0.85rem' }}>
                                LADEN...
                            </div>
                        ) : ranked.length === 0 ? (
                            <div style={{ padding: 'var(--spacing-md)', opacity: 0.5, fontWeight: 'bold', fontSize: '0.85rem' }}>
                                {query ? 'GEEN PROJECT GEVONDEN' : 'NOG GEEN PROJECTEN'}
                            </div>
                        ) : (
                            ranked.map(p => {
                                const isSelected = p.id === selectedId;
                                return (
                                    <button
                                        key={p.id}
                                        onClick={() => setSelectedId(p.id)}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '10px',
                                            padding: 'var(--spacing-sm) var(--spacing-md)',
                                            border: 'none',
                                            borderLeft: `6px solid ${isSelected ? p.color : 'transparent'}`,
                                            borderBottom: '1px solid rgba(128,128,128,0.2)',
                                            background: isSelected ? 'var(--color-text)' : 'transparent',
                                            color: isSelected ? 'var(--color-bg)' : 'var(--color-text)',
                                            cursor: 'pointer', textAlign: 'left', width: '100%'
                                        }}
                                    >
                                        <div style={{
                                            width: '12px', height: '12px', borderRadius: '2px',
                                            background: p.color, border: '2px solid currentColor', flexShrink: 0
                                        }} />
                                        <span style={{
                                            flex: 1, fontWeight: 'bold', fontSize: '0.9rem',
                                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                                        }}>
                                            {p.name}
                                        </span>
                                        <span style={{ fontSize: '0.7rem', opacity: 0.6, flexShrink: 0 }}>
                                            {p.last_worked ? p.last_worked.slice(5) : 'nieuw'}
                                        </span>
                                        <span style={{
                                            fontFamily: 'var(--font-heading)', fontSize: '0.85rem',
                                            opacity: 0.8, flexShrink: 0, minWidth: '52px', textAlign: 'right'
                                        }}>
                                            {formatHours(p.total_hours)}
                                        </span>
                                    </button>
                                );
                            })
                        )}
                    </div>

                    {showNew ? (
                        <div style={{ marginTop: 'var(--spacing-sm)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                            <input
                                type="text"
                                value={newName}
                                autoFocus
                                onChange={e => setNewName(e.target.value.slice(0, 50))}
                                onKeyDown={e => {
                                    if (e.key === 'Enter') handleCreate();
                                    if (e.key === 'Escape') setShowNew(false);
                                }}
                                placeholder="Naam van het nieuwe project..."
                                style={inputStyle}
                            />
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {PROJECT_COLORS.map(color => (
                                    <button
                                        key={color}
                                        onClick={() => setNewColor(color)}
                                        style={{
                                            width: '26px', height: '26px', borderRadius: '2px', background: color,
                                            border: newColor === color ? '3px solid var(--color-text)' : '2px solid transparent',
                                            outline: newColor === color ? '2px solid var(--color-primary)' : 'none',
                                            cursor: 'pointer', padding: 0
                                        }}
                                    />
                                ))}
                            </div>
                            <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                                <button
                                    onClick={handleCreate}
                                    disabled={!newName.trim()}
                                    style={{
                                        flex: 1, background: 'var(--color-primary)', color: 'white',
                                        padding: 'var(--spacing-sm)', border: 'var(--brutalist-border)',
                                        fontFamily: 'var(--font-heading)', textTransform: 'uppercase',
                                        cursor: 'pointer', opacity: newName.trim() ? 1 : 0.5
                                    }}
                                >
                                    Aanmaken
                                </button>
                                <button
                                    onClick={() => setShowNew(false)}
                                    style={{
                                        background: 'var(--color-bg)', color: 'var(--color-text)',
                                        padding: 'var(--spacing-sm) var(--spacing-md)', border: 'var(--brutalist-border)',
                                        fontFamily: 'var(--font-heading)', textTransform: 'uppercase', cursor: 'pointer'
                                    }}
                                >
                                    Annuleer
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button
                            onClick={() => { setShowNew(true); setNewName(query); }}
                            style={{
                                marginTop: 'var(--spacing-sm)', width: '100%',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                padding: 'var(--spacing-sm)', border: '2px dashed rgba(128,128,128,0.5)',
                                background: 'transparent', color: 'var(--color-text)',
                                fontFamily: 'var(--font-heading)', textTransform: 'uppercase',
                                fontSize: '0.8rem', cursor: 'pointer', opacity: 0.7
                            }}
                        >
                            <Plus size={16} />
                            Nieuw project
                        </button>
                    )}

                    <div style={{ marginTop: 'var(--spacing-lg)' }}>
                        <label
                            htmlFor="timer-intent"
                            style={{ display: 'block', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '6px' }}
                        >
                            Wat ga je doen?
                        </label>
                        <input
                            id="timer-intent"
                            ref={intentRef}
                            type="text"
                            value={intent}
                            onChange={e => setIntent(e.target.value.slice(0, 200))}
                            onKeyDown={e => e.key === 'Enter' && handleStart()}
                            placeholder="Bijv. timer afbouwen en testen"
                            style={inputStyle}
                        />
                        <div style={{ fontSize: '0.7rem', opacity: 0.5, marginTop: '4px' }}>
                            Dit staat straks op je focusscherm en wordt je notitie. Aanpassen kan bij het stoppen.
                        </div>
                    </div>
                </div>

                <div style={{ padding: 'var(--spacing-lg)', borderTop: 'var(--brutalist-border)' }}>
                    <button
                        onClick={handleStart}
                        disabled={!canStart}
                        style={{
                            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                            background: selected ? selected.color : 'var(--color-primary)', color: 'white',
                            padding: 'var(--spacing-md)', fontSize: '1.2rem',
                            fontFamily: 'var(--font-heading)', textTransform: 'uppercase',
                            border: 'var(--brutalist-border)', boxShadow: '4px 4px 0px var(--color-text)',
                            cursor: canStart ? 'pointer' : 'not-allowed', opacity: canStart ? 1 : 0.45
                        }}
                    >
                        {busy ? <Loader2 size={22} className="animate-spin" /> : <Play size={22} />}
                        {selected ? `Start — ${selected.name}` : 'Kies een project'}
                    </button>
                </div>
            </div>
        </div>
    );
};
