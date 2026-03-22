import { useEffect, useState } from 'react';
import { format, parseISO, getDay } from 'date-fns';
import { X, Trash2, Clock, FileText, FolderOpen } from 'lucide-react';
import type { WorkLogEntry } from '../hooks/useSupabaseWorkLogs';
import type { Project } from '../hooks/useSupabaseProjects';

interface DayDetailModalProps {
    date: string;
    totalHours: number;
    allWorkHours: Record<string, number>;
    onClose: () => void;
    onDelete: (entryId: string, date: string) => Promise<void>;
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

export const DayDetailModal = ({ date, totalHours, allWorkHours, onClose, onDelete, fetchEntries, projects }: DayDetailModalProps) => {
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
        <div
            style={{
                position: 'fixed', inset: 0,
                background: 'rgba(0,0,0,0.6)',
                zIndex: 1000,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: 'var(--spacing-md)'
            }}
            onClick={onClose}
        >
            <div
                style={{
                    background: 'var(--color-bg)',
                    border: 'var(--brutalist-border)',
                    boxShadow: '8px 8px 0px var(--color-text)',
                    width: '100%',
                    maxWidth: '560px',
                    maxHeight: '90vh',
                    overflowY: 'auto',
                    position: 'relative'
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                    padding: 'var(--spacing-lg)',
                    borderBottom: 'var(--brutalist-border)',
                    background: 'var(--color-text)',
                    color: 'var(--color-bg)'
                }}>
                    <div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', opacity: 0.7, marginBottom: '4px' }}>
                            Day Detail
                        </div>
                        <h2 style={{ margin: 0, fontFamily: 'var(--font-heading)', textTransform: 'uppercase', fontSize: '1.4rem' }}>
                            {formatDateHeading(date)}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'transparent', border: 'none', color: 'var(--color-bg)',
                            cursor: 'pointer', padding: '4px', marginTop: '-4px'
                        }}
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Total hours */}
                <div style={{
                    padding: 'var(--spacing-lg)',
                    borderBottom: 'var(--brutalist-border)',
                    display: 'flex', alignItems: 'baseline', gap: '8px'
                }}>
                    <span style={{ fontFamily: 'var(--font-heading)', fontSize: '4rem', lineHeight: 1, color: 'var(--color-primary)' }}>
                        {totalHours.toFixed(1)}
                    </span>
                    <span style={{ fontWeight: 'bold', textTransform: 'uppercase', opacity: 0.6 }}>hours total</span>
                </div>

                {/* Stats */}
                {allValues.length > 1 && (
                    <div style={{
                        padding: 'var(--spacing-md) var(--spacing-lg)',
                        borderBottom: 'var(--brutalist-border)',
                        display: 'grid', gridTemplateColumns: '1fr 1fr',
                        gap: 'var(--spacing-sm)',
                        background: 'rgba(128,128,128,0.05)'
                    }}>
                        {percentile !== null && (
                            <div>
                                <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 'bold', opacity: 0.5 }}>Percentiel</div>
                                <div style={{ fontSize: '1.3rem', fontWeight: '900', color: percentile >= 90 ? 'var(--color-primary)' : 'var(--color-text)' }}>
                                    Top {100 - percentile}%
                                </div>
                                <div style={{ fontSize: '0.7rem', opacity: 0.5 }}>van je werkdagen</div>
                            </div>
                        )}
                        <div>
                            <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 'bold', opacity: 0.5 }}>Gem. {dayOfWeek}</div>
                            <div style={{ fontSize: '1.3rem', fontWeight: '900' }}>{dayOfWeekAvg.toFixed(1)}h</div>
                            <div style={{ fontSize: '0.7rem', opacity: 0.5 }}>
                                {totalHours > dayOfWeekAvg ? '↑ boven gemiddelde' : totalHours < dayOfWeekAvg ? '↓ onder gemiddelde' : '= gemiddelde'}
                            </div>
                        </div>
                    </div>
                )}

                {/* Sessions */}
                <div style={{ padding: 'var(--spacing-lg)' }}>
                    <h3 style={{ margin: '0 0 var(--spacing-md) 0', textTransform: 'uppercase', fontSize: '0.9rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Clock size={16} />
                        Sessie-registraties
                    </h3>

                    {loading ? (
                        <div style={{ opacity: 0.5, fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.85rem' }}>Laden...</div>
                    ) : entries.length === 0 ? (
                        <div style={{
                            padding: 'var(--spacing-md)',
                            border: '2px dashed rgba(128,128,128,0.3)',
                            textAlign: 'center',
                            opacity: 0.5,
                            fontSize: '0.85rem',
                            fontWeight: 'bold',
                            textTransform: 'uppercase'
                        }}>
                            Geen sessie-details beschikbaar voor deze dag
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                            {entries.map(entry => (
                                <div key={entry.id} style={{
                                    border: 'var(--brutalist-border)',
                                    padding: 'var(--spacing-sm) var(--spacing-md)',
                                    display: 'flex', alignItems: 'flex-start', gap: 'var(--spacing-sm)',
                                    background: 'var(--color-bg)'
                                }}>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: entry.note ? '4px' : 0 }}>
                                            <span style={{
                                                fontFamily: 'var(--font-heading)',
                                                fontSize: '1.4rem',
                                                color: 'var(--color-primary)',
                                                lineHeight: 1
                                            }}>
                                                {Number(entry.hours).toFixed(1)}h
                                            </span>
                                            <span style={{ fontSize: '0.75rem', opacity: 0.5, fontWeight: 'bold' }}>
                                                {formatTime(entry.created_at)}
                                            </span>
                                        </div>
                                        {entry.note && (
                                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '4px', marginTop: '4px' }}>
                                                <FileText size={12} style={{ opacity: 0.4, marginTop: '2px', flexShrink: 0 }} />
                                                <span style={{ fontSize: '0.85rem', opacity: 0.8, wordBreak: 'break-word' }}>{entry.note}</span>
                                            </div>
                                        )}
                                        {entry.project_id && (() => {
                                            const project = projects.find(p => p.id === entry.project_id);
                                            if (!project) return null;
                                            return (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                                                    <FolderOpen size={12} style={{ opacity: 0.4, flexShrink: 0 }} />
                                                    <span style={{
                                                        fontSize: '0.75rem',
                                                        fontWeight: 'bold',
                                                        padding: '1px 6px',
                                                        borderRadius: '2px',
                                                        background: project.color + '22',
                                                        color: project.color,
                                                        border: `1px solid ${project.color}44`
                                                    }}>
                                                        {project.name}
                                                    </span>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                    <button
                                        onClick={() => handleDelete(entry.id)}
                                        disabled={deletingId === entry.id}
                                        style={{
                                            background: 'transparent',
                                            border: '2px solid transparent',
                                            cursor: 'pointer',
                                            color: 'var(--color-text)',
                                            opacity: deletingId === entry.id ? 0.3 : 0.4,
                                            padding: '4px',
                                            flexShrink: 0,
                                            transition: 'opacity 0.15s'
                                        }}
                                        onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                                        onMouseLeave={e => (e.currentTarget.style.opacity = deletingId === entry.id ? '0.3' : '0.4')}
                                        title="Verwijder sessie"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
