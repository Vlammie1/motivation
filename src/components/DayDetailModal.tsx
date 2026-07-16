import { useEffect, useState } from 'react';
import { format, parseISO, getDay } from 'date-fns';
import { X, Trash2, Clock, FileText, FolderOpen, Pencil, Check } from 'lucide-react';
import type { WorkLogEntry } from '../hooks/useSupabaseWorkLogs';
import type { Project } from '../hooks/useSupabaseProjects';
import { ChipSelect } from './tasks/ChipSelect';

export type EntryUpdates = { hours?: number; note?: string | null; project_id?: string | null };

interface DayDetailModalProps {
    date: string;
    totalHours: number;
    allWorkHours: Record<string, number>;
    onClose: () => void;
    onDelete: (entryId: string, date: string) => Promise<void>;
    onEdit: (entryId: string, date: string, updates: EntryUpdates) => Promise<void>;
    fetchEntries: (date: string) => Promise<WorkLogEntry[]>;
    projects: Project[];
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const formatTime = (isoString: string) => {
    try {
        const d = new Date(isoString);
        return d.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
    } catch {
        return '??:??';
    }
};

const formatDateHeading = (dateStr: string) => {
    try {
        return format(parseISO(dateStr), 'EEEE d MMMM yyyy');
    } catch {
        return dateStr;
    }
};

/** Eén sessie, met een bewerkstand voor als je achteraf een fout ontdekt. */
const EntryRow = ({ entry, projects, onSave, onDelete, deleting }: {
    entry: WorkLogEntry;
    projects: Project[];
    onSave: (updates: EntryUpdates) => Promise<void>;
    onDelete: () => void;
    deleting: boolean;
}) => {
    const [editing, setEditing] = useState(false);
    const [hours, setHours] = useState(String(entry.hours));
    const [note, setNote] = useState(entry.note || '');
    const [projectId, setProjectId] = useState(entry.project_id || '');
    const [saving, setSaving] = useState(false);

    const project = projects.find(p => p.id === entry.project_id);

    // "Geen project" hoort ook een keuze te zijn, met een neutrale kleur.
    const projectOptions = [
        { value: '', label: 'Geen project', color: 'var(--color-text-muted)' },
        ...projects.map(p => ({ value: p.id, label: p.name, color: p.color }))
    ];

    const startEdit = () => {
        setHours(String(entry.hours));
        setNote(entry.note || '');
        setProjectId(entry.project_id || '');
        setEditing(true);
    };

    const save = async () => {
        const parsed = parseFloat(hours.replace(',', '.'));
        if (isNaN(parsed) || parsed <= 0 || parsed > 24) {
            alert('Vul een aantal uren in tussen 0 en 24.');
            return;
        }
        setSaving(true);
        await onSave({
            hours: Math.round(parsed * 100) / 100,
            note: note.trim() || null,
            project_id: projectId || null
        });
        setSaving(false);
        setEditing(false);
    };

    const containerStyle: React.CSSProperties = {
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        padding: 'var(--spacing-sm) var(--spacing-md)',
        background: 'var(--color-surface-2)'
    };

    if (editing) {
        return (
            <div style={{ ...containerStyle, display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                    <div style={{ width: '90px' }}>
                        <label className="label" htmlFor={`hours-${entry.id}`}>Uren</label>
                        <input
                            id={`hours-${entry.id}`}
                            type="number"
                            step="0.25"
                            min="0"
                            max="24"
                            autoFocus
                            value={hours}
                            onChange={e => setHours(e.target.value)}
                            style={{ width: '100%', boxSizing: 'border-box' }}
                        />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <span className="label" aria-hidden="true">Project</span>
                        <div>
                            <ChipSelect
                                value={projectId}
                                options={projectOptions}
                                onChange={setProjectId}
                                ariaLabel="Project"
                            />
                        </div>
                    </div>
                </div>
                <div>
                    <label className="label" htmlFor={`note-${entry.id}`}>Beschrijving</label>
                    <input
                        id={`note-${entry.id}`}
                        type="text"
                        value={note}
                        onChange={e => setNote(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === 'Enter') save();
                            if (e.key === 'Escape') setEditing(false);
                        }}
                        placeholder="Waar heb je aan gewerkt?"
                        style={{ width: '100%', boxSizing: 'border-box' }}
                    />
                </div>
                <div style={{ display: 'flex', gap: 'var(--spacing-xs)' }}>
                    <button
                        className="btn-primary"
                        onClick={save}
                        disabled={saving}
                        style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            gap: 'var(--spacing-2xs)', padding: 'var(--spacing-xs) var(--spacing-md)'
                        }}
                    >
                        <Check size={14} /> {saving ? 'Opslaan…' : 'Opslaan'}
                    </button>
                    <button
                        onClick={() => setEditing(false)}
                        disabled={saving}
                        style={{ padding: 'var(--spacing-xs) var(--spacing-md)' }}
                    >
                        Annuleer
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div style={{ ...containerStyle, display: 'flex', alignItems: 'flex-start', gap: 'var(--spacing-sm)' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--spacing-xs)' }}>
                    <span style={{
                        fontFamily: 'var(--font-heading)',
                        fontSize: 'var(--text-lg)',
                        color: 'var(--color-primary)',
                        lineHeight: 1
                    }}>
                        {Number(entry.hours).toFixed(1)}h
                    </span>
                    <span className="muted" style={{ fontSize: 'var(--text-xs)' }}>
                        {formatTime(entry.created_at)}
                    </span>
                </div>
                {entry.note && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--spacing-2xs)', marginTop: 'var(--spacing-2xs)' }}>
                        <FileText size={12} className="muted" style={{ marginTop: '3px', flexShrink: 0 }} />
                        <span style={{ fontSize: 'var(--text-sm)', wordBreak: 'break-word' }}>{entry.note}</span>
                    </div>
                )}
                {project && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2xs)', marginTop: 'var(--spacing-xs)' }}>
                        <FolderOpen size={12} className="muted" style={{ flexShrink: 0 }} />
                        <span style={{
                            fontSize: 'var(--text-xs)',
                            fontWeight: 600,
                            padding: '2px 8px',
                            borderRadius: 'var(--radius-full)',
                            background: project.color + '1f',
                            color: project.color,
                        }}>
                            {project.name}
                        </span>
                    </div>
                )}
            </div>
            <button
                onClick={startEdit}
                style={{
                    display: 'flex', background: 'none', border: 'none', boxShadow: 'none',
                    color: 'var(--color-text-muted)', padding: 'var(--spacing-2xs)', flexShrink: 0
                }}
                title="Sessie aanpassen"
            >
                <Pencil size={15} />
            </button>
            <button
                onClick={onDelete}
                disabled={deleting}
                style={{
                    display: 'flex', background: 'none', border: 'none', boxShadow: 'none',
                    color: 'var(--color-text-muted)', padding: 'var(--spacing-2xs)', flexShrink: 0
                }}
                title="Verwijder sessie"
            >
                <Trash2 size={15} />
            </button>
        </div>
    );
};

export const DayDetailModal = ({ date, totalHours, allWorkHours, onClose, onDelete, onEdit, fetchEntries, projects }: DayDetailModalProps) => {
    const [entries, setEntries] = useState<WorkLogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        fetchEntries(date).then(data => {
            if (!cancelled) {
                setEntries(data);
                setLoading(false);
            }
        });
        return () => { cancelled = true; };
    }, [date]);

    // Re-fetch when totalHours changes (after a delete from parent)
    useEffect(() => {
        fetchEntries(date).then(data => setEntries(data));
    }, [totalHours]);

    const handleDelete = async (entryId: string) => {
        setDeletingId(entryId);
        await onDelete(entryId, date);
        setEntries(prev => prev.filter(e => e.id !== entryId));
        setDeletingId(null);
    };

    const handleEdit = async (entryId: string, updates: EntryUpdates) => {
        await onEdit(entryId, date, updates);
        // Het totaal in de header verandert mee; die refetch loopt via de
        // parent. De rij zelf werken we hier meteen bij.
        setEntries(prev => prev.map(e => (e.id === entryId ? { ...e, ...updates } as WorkLogEntry : e)));
    };

    // Day stats
    const allValues = Object.values(allWorkHours).filter(h => h > 0).sort((a, b) => b - a);
    const rank = allValues.indexOf(totalHours) + 1;
    const percentile = allValues.length > 0
        ? Math.round((1 - rank / allValues.length) * 100)
        : null;
    const dayOfWeek = DAY_NAMES[getDay(parseISO(date))];

    // Day-of-week average
    const dayOfWeekHours = Object.entries(allWorkHours)
        .filter(([d, h]) => h > 0 && DAY_NAMES[getDay(parseISO(d))] === dayOfWeek)
        .map(([, h]) => h);
    const dayOfWeekAvg = dayOfWeekHours.length > 0
        ? dayOfWeekHours.reduce((a, b) => a + b, 0) / dayOfWeekHours.length
        : 0;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div
                className="modal-panel"
                style={{ maxWidth: '560px', padding: 0 }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                    padding: 'var(--spacing-lg)',
                    borderBottom: '1px solid var(--color-border)',
                }}>
                    <div>
                        <div className="label">Day detail</div>
                        <h2 style={{ margin: 0, fontSize: 'var(--text-xl)' }}>
                            {formatDateHeading(date)}
                        </h2>
                    </div>
                    <button className="modal-close" onClick={onClose} aria-label="Sluiten">
                        <X size={18} />
                    </button>
                </div>

                {/* Total hours */}
                <div style={{
                    padding: 'var(--spacing-lg)',
                    borderBottom: '1px solid var(--color-border)',
                    display: 'flex', alignItems: 'baseline', gap: 'var(--spacing-xs)'
                }}>
                    <span style={{ fontFamily: 'var(--font-heading)', fontSize: '2.75rem', lineHeight: 1, color: 'var(--color-primary)' }}>
                        {totalHours.toFixed(1)}
                    </span>
                    <span className="muted" style={{ fontSize: 'var(--text-sm)' }}>uur totaal</span>
                </div>

                {/* Stats */}
                {allValues.length > 1 && (
                    <div style={{
                        padding: 'var(--spacing-md) var(--spacing-lg)',
                        borderBottom: '1px solid var(--color-border)',
                        display: 'grid', gridTemplateColumns: '1fr 1fr',
                        gap: 'var(--spacing-md)',
                        background: 'var(--color-surface-2)'
                    }}>
                        {percentile !== null && (
                            <div>
                                <div className="label">Percentiel</div>
                                <div style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: percentile >= 90 ? 'var(--color-primary)' : 'var(--color-text)' }}>
                                    Top {100 - percentile}%
                                </div>
                                <div className="muted" style={{ fontSize: 'var(--text-xs)' }}>van je werkdagen</div>
                            </div>
                        )}
                        <div>
                            <div className="label">Gem. {dayOfWeek}</div>
                            <div style={{ fontSize: 'var(--text-lg)', fontWeight: 700 }}>{dayOfWeekAvg.toFixed(1)}h</div>
                            <div className="muted" style={{ fontSize: 'var(--text-xs)' }}>
                                {totalHours > dayOfWeekAvg ? '↑ boven gemiddelde' : totalHours < dayOfWeekAvg ? '↓ onder gemiddelde' : '= gemiddelde'}
                            </div>
                        </div>
                    </div>
                )}

                {/* Sessions */}
                <div style={{ padding: 'var(--spacing-lg)' }}>
                    <h3 style={{ margin: '0 0 var(--spacing-md) 0', fontSize: 'var(--text-base)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                        <Clock size={15} />
                        Sessie-registraties
                    </h3>

                    {loading ? (
                        <div className="muted" style={{ fontSize: 'var(--text-sm)' }}>Laden…</div>
                    ) : entries.length === 0 ? (
                        <div className="muted" style={{
                            padding: 'var(--spacing-lg)',
                            border: '1px dashed var(--color-border-strong)',
                            borderRadius: 'var(--radius-md)',
                            textAlign: 'center',
                            fontSize: 'var(--text-sm)'
                        }}>
                            Geen sessie-details beschikbaar voor deze dag
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                            {entries.map(entry => (
                                <EntryRow
                                    key={entry.id}
                                    entry={entry}
                                    projects={projects}
                                    deleting={deletingId === entry.id}
                                    onDelete={() => handleDelete(entry.id)}
                                    onSave={updates => handleEdit(entry.id, updates)}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
