import { useEffect, useMemo, useRef, useState } from 'react';
import { Play, Plus, Search, X, Loader2 } from 'lucide-react';
import { useProjects } from '../context/ProjectsContext';
import type { ProjectStats } from '../hooks/useSupabaseProjects';
import { emptyTaskCounts } from '../lib/tasks';
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
            { ...created, total_hours: 0, sessions: 0, hours_last_7: 0, hours_last_30: 0, avg_session: 0, last_worked: null, tasks: emptyTaskCounts() }
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
        <div className="modal-overlay" style={{ zIndex: 10000 }} onClick={onClose}>
            <div
                className="modal-panel"
                style={{
                    maxWidth: '520px',
                    padding: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden'
                }}
                onClick={e => e.stopPropagation()}
            >
                <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: 'var(--spacing-md) var(--spacing-lg)',
                    borderBottom: '1px solid var(--color-border)'
                }}>
                    <h2 style={{ margin: 0, fontSize: 'var(--text-lg)' }}>
                        {switchedFrom ? 'Volgend project' : 'Start timer'}
                    </h2>
                    <button className="modal-close" onClick={onClose} aria-label="Sluiten">
                        <X size={18} />
                    </button>
                </div>

                {switchedFrom && (
                    <div style={{
                        padding: 'var(--spacing-xs) var(--spacing-lg)',
                        background: 'var(--color-surface-2)',
                        borderBottom: '1px solid var(--color-border)',
                        color: 'var(--color-text-muted)',
                        fontSize: 'var(--text-xs)'
                    }}>
                        ✓ Sessie op {switchedFrom} opgeslagen
                    </div>
                )}

                <div style={{ padding: 'var(--spacing-lg)', overflowY: 'auto', flex: 1 }}>
                    <label className="label" htmlFor="timer-project-search">
                        Waar ga je aan werken?
                    </label>

                    <div style={{ position: 'relative', marginBottom: 'var(--spacing-sm)' }}>
                        <Search size={15} className="muted" style={{ position: 'absolute', left: 'var(--spacing-sm)', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                        <input
                            id="timer-project-search"
                            type="text"
                            value={query}
                            autoFocus={!initialProjectId}
                            onChange={e => setQuery(e.target.value)}
                            placeholder="Zoek project..."
                            style={{ ...inputStyle, paddingLeft: '34px' }}
                        />
                    </div>

                    <div style={{
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-md)',
                        maxHeight: '210px', overflowY: 'auto',
                        display: 'flex', flexDirection: 'column'
                    }}>
                        {loading ? (
                            <div className="muted" style={{ padding: 'var(--spacing-md)', fontSize: 'var(--text-sm)' }}>
                                Laden…
                            </div>
                        ) : ranked.length === 0 ? (
                            <div className="muted" style={{ padding: 'var(--spacing-md)', fontSize: 'var(--text-sm)' }}>
                                {query ? 'Geen project gevonden' : 'Nog geen projecten'}
                            </div>
                        ) : (
                            ranked.map(p => {
                                const isSelected = p.id === selectedId;
                                return (
                                    <button
                                        key={p.id}
                                        onClick={() => setSelectedId(p.id)}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)',
                                            padding: 'var(--spacing-xs) var(--spacing-sm)',
                                            border: 'none',
                                            borderRadius: 0,
                                            boxShadow: 'none',
                                            background: isSelected ? 'var(--color-surface-2)' : 'transparent',
                                            cursor: 'pointer', textAlign: 'left', width: '100%'
                                        }}
                                    >
                                        <div style={{
                                            width: '9px', height: '9px', borderRadius: 'var(--radius-full)',
                                            background: p.color, flexShrink: 0
                                        }} />
                                        <span style={{
                                            flex: 1, fontWeight: isSelected ? 600 : 400, fontSize: 'var(--text-sm)',
                                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                                        }}>
                                            {p.name}
                                        </span>
                                        <span className="muted" style={{ fontSize: 'var(--text-xs)', flexShrink: 0 }}>
                                            {p.last_worked ? p.last_worked.slice(5) : 'nieuw'}
                                        </span>
                                        <span className="muted" style={{
                                            fontFamily: 'var(--font-heading)', fontSize: 'var(--text-sm)',
                                            flexShrink: 0, minWidth: '52px', textAlign: 'right'
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
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-2xs)' }}>
                                {PROJECT_COLORS.map(color => (
                                    <button
                                        key={color}
                                        onClick={() => setNewColor(color)}
                                        aria-label={`Kleur ${color}`}
                                        style={{
                                            width: '24px', height: '24px', borderRadius: 'var(--radius-full)', background: color,
                                            border: 'none',
                                            boxShadow: newColor === color
                                                ? '0 0 0 2px var(--color-bg), 0 0 0 4px var(--color-primary)'
                                                : 'none',
                                            cursor: 'pointer', padding: 0
                                        }}
                                    />
                                ))}
                            </div>
                            <div style={{ display: 'flex', gap: 'var(--spacing-xs)' }}>
                                <button
                                    onClick={handleCreate}
                                    disabled={!newName.trim()}
                                    className="btn-primary"
                                    style={{ flex: 1, padding: 'var(--spacing-xs)' }}
                                >
                                    Aanmaken
                                </button>
                                <button
                                    onClick={() => setShowNew(false)}
                                    style={{ padding: 'var(--spacing-xs) var(--spacing-md)' }}
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
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--spacing-2xs)',
                                padding: 'var(--spacing-xs)', border: '1px dashed var(--color-border-strong)',
                                background: 'transparent', color: 'var(--color-text-muted)',
                                boxShadow: 'none',
                                fontSize: 'var(--text-sm)', fontWeight: 600, cursor: 'pointer'
                            }}
                        >
                            <Plus size={15} />
                            Nieuw project
                        </button>
                    )}

                    <div style={{ marginTop: 'var(--spacing-lg)' }}>
                        <label className="label" htmlFor="timer-intent">
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
                        <div className="muted" style={{ fontSize: 'var(--text-xs)', marginTop: 'var(--spacing-2xs)' }}>
                            Dit staat straks op je focusscherm en wordt je notitie. Aanpassen kan bij het stoppen.
                        </div>
                    </div>
                </div>

                <div style={{ padding: 'var(--spacing-md) var(--spacing-lg)', borderTop: '1px solid var(--color-border)' }}>
                    <button
                        onClick={handleStart}
                        disabled={!canStart}
                        className="btn-primary"
                        style={{
                            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--spacing-xs)',
                            background: selected ? selected.color : 'var(--color-primary)',
                            padding: 'var(--spacing-sm)', fontSize: 'var(--text-base)',
                        }}
                    >
                        {busy ? <Loader2 size={17} className="animate-spin" /> : <Play size={17} />}
                        {selected ? `Start — ${selected.name}` : 'Kies een project'}
                    </button>
                </div>
            </div>
        </div>
    );
};
