import { useCallback, useEffect, useMemo, useState } from 'react';
import { Archive, ArchiveRestore, Check, Lock, Play, Plus, Trash2, X, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useProjects } from '../context/ProjectsContext';
import { useTimer } from '../context/TimerContext';
import type { ProjectStats } from '../hooks/useSupabaseProjects';
import { PROJECT_COLORS, DEFAULT_PROJECT_COLOR } from '../lib/projectColors';
import { formatHours } from '../lib/time';
import { ThemeSwitcher } from '../components/ThemeSwitcher';
import { HypeButton } from '../components/HypeButton';

const sectionStyle: React.CSSProperties = {
    border: 'var(--brutalist-border)',
    padding: 'var(--spacing-lg)',
    background: 'var(--color-bg)',
    boxShadow: 'var(--brutalist-shadow)'
};

const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: 'var(--spacing-sm)',
    border: 'var(--brutalist-border)',
    fontSize: '0.95rem',
    fontFamily: 'var(--font-heading)',
    outline: 'none',
    background: 'var(--color-bg)',
    color: 'var(--color-text)',
    boxSizing: 'border-box'
};

const Stat = ({ label, value }: { label: string; value: string }) => (
    <div>
        <div style={{ fontSize: '0.65rem', opacity: 0.5, textTransform: 'uppercase', fontWeight: 'bold' }}>{label}</div>
        <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1rem' }}>{value}</div>
    </div>
);

const ProjectsPage = () => {
    const { user, loading: authLoading } = useAuth();
    const { addProject, updateProject, deleteProject, getProjectStats } = useProjects();
    const { openStart, version, timer } = useTimer();

    const [stats, setStats] = useState<ProjectStats[]>([]);
    const [loading, setLoading] = useState(true);
    const [showArchived, setShowArchived] = useState(false);
    const [showAdd, setShowAdd] = useState(false);
    const [newName, setNewName] = useState('');
    const [newColor, setNewColor] = useState(DEFAULT_PROJECT_COLOR);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [editColor, setEditColor] = useState(DEFAULT_PROJECT_COLOR);

    const load = useCallback(async () => {
        const data = await getProjectStats();
        setStats(data);
        setLoading(false);
    }, [getProjectStats]);

    // Herladen zodra de timer een sessie wegschrijft, anders staan de uren hier
    // meteen achter.
    useEffect(() => {
        if (!user) return;
        let cancelled = false;
        getProjectStats().then(data => {
            if (cancelled) return;
            setStats(data);
            setLoading(false);
        });
        return () => { cancelled = true; };
    }, [user, getProjectStats, version]);

    const visible = useMemo(
        () => stats.filter(p => showArchived || !p.archived),
        [stats, showArchived]
    );

    const archivedCount = stats.filter(p => p.archived).length;
    const totalHours = stats.reduce((sum, p) => sum + p.total_hours, 0);

    const handleAdd = async () => {
        const name = newName.trim();
        if (!name) return;
        const created = await addProject(name, newColor);
        if (!created) return;
        setNewName('');
        setNewColor(DEFAULT_PROJECT_COLOR);
        setShowAdd(false);
        load();
    };

    const startEdit = (project: ProjectStats) => {
        setEditingId(project.id);
        setEditName(project.name);
        setEditColor(project.color);
    };

    const saveEdit = async () => {
        const name = editName.trim();
        if (!editingId || !name) return;
        await updateProject(editingId, { name, color: editColor });
        setEditingId(null);
        load();
    };

    const toggleArchived = async (project: ProjectStats) => {
        await updateProject(project.id, { archived: !project.archived });
        load();
    };

    const handleDelete = async (project: ProjectStats) => {
        const warning = project.total_hours > 0
            ? `"${project.name}" verwijderen? Je ${formatHours(project.total_hours)} aan gelogde uren raakt het project kwijt.\n\nArchiveren houdt de uren intact.`
            : `"${project.name}" verwijderen?`;
        if (!confirm(warning)) return;
        await deleteProject(project.id);
        load();
    };

    if (authLoading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--spacing-xl)' }}>
                <Loader2 className="animate-spin" size={48} />
            </div>
        );
    }

    if (!user) {
        return (
            <div style={{ ...sectionStyle, textAlign: 'center', marginTop: 'var(--spacing-xl)' }}>
                <Lock size={48} style={{ marginBottom: 'var(--spacing-md)' }} />
                <h2 style={{ textTransform: 'uppercase', marginBottom: 'var(--spacing-md)', fontSize: '2rem' }}>Access Denied</h2>
                <p style={{ fontWeight: 'bold' }}>LOG IN OM JE PROJECTEN TE BEHEREN.</p>
            </div>
        );
    }

    return (
        <div>
            <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                <ThemeSwitcher />
            </div>

            <header style={{ marginBottom: 'var(--spacing-xl)' }}>
                <h1 style={{
                    fontSize: '3rem', textTransform: 'uppercase', fontFamily: 'var(--font-heading)',
                    borderBottom: '8px solid var(--color-primary)', display: 'inline-block',
                    marginBottom: 'var(--spacing-md)'
                }}>
                    Projecten
                </h1>
                <p style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
                    {stats.length} PROJECTEN · {formatHours(totalHours)} TOTAAL
                </p>
            </header>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xl)' }}>
                <section style={sectionStyle}>
                    <div style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        gap: 'var(--spacing-md)', flexWrap: 'wrap', marginBottom: 'var(--spacing-lg)'
                    }}>
                        <h2 style={{ textTransform: 'uppercase', margin: 0 }}>Overzicht</h2>
                        <div style={{ display: 'flex', gap: 'var(--spacing-sm)', flexWrap: 'wrap' }}>
                            {archivedCount > 0 && (
                                <button
                                    onClick={() => setShowArchived(v => !v)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '6px',
                                        padding: 'var(--spacing-sm) var(--spacing-md)',
                                        background: showArchived ? 'var(--color-text)' : 'var(--color-bg)',
                                        color: showArchived ? 'var(--color-bg)' : 'var(--color-text)',
                                        border: 'var(--brutalist-border)', cursor: 'pointer',
                                        fontFamily: 'var(--font-heading)', textTransform: 'uppercase', fontSize: '0.8rem'
                                    }}
                                >
                                    <Archive size={14} />
                                    {showArchived ? 'Verberg' : 'Toon'} archief ({archivedCount})
                                </button>
                            )}
                            <button
                                onClick={() => setShowAdd(v => !v)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '6px',
                                    padding: 'var(--spacing-sm) var(--spacing-md)',
                                    background: 'var(--color-primary)', color: 'white',
                                    border: 'var(--brutalist-border)', boxShadow: '4px 4px 0px var(--color-text)',
                                    cursor: 'pointer', fontFamily: 'var(--font-heading)',
                                    textTransform: 'uppercase', fontSize: '0.8rem'
                                }}
                            >
                                <Plus size={14} />
                                Nieuw project
                            </button>
                        </div>
                    </div>

                    {showAdd && (
                        <div style={{
                            border: '2px dashed rgba(128,128,128,0.5)', padding: 'var(--spacing-md)',
                            marginBottom: 'var(--spacing-lg)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)'
                        }}>
                            <input
                                type="text"
                                value={newName}
                                autoFocus
                                onChange={e => setNewName(e.target.value.slice(0, 50))}
                                onKeyDown={e => {
                                    if (e.key === 'Enter') handleAdd();
                                    if (e.key === 'Escape') setShowAdd(false);
                                }}
                                placeholder="Projectnaam..."
                                style={inputStyle}
                            />
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {PROJECT_COLORS.map(color => (
                                    <button
                                        key={color}
                                        onClick={() => setNewColor(color)}
                                        style={{
                                            width: '28px', height: '28px', borderRadius: '2px', background: color,
                                            border: newColor === color ? '3px solid var(--color-text)' : '2px solid transparent',
                                            outline: newColor === color ? '2px solid var(--color-primary)' : 'none',
                                            cursor: 'pointer', padding: 0
                                        }}
                                    />
                                ))}
                            </div>
                            <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                                <button
                                    onClick={handleAdd}
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
                                    onClick={() => setShowAdd(false)}
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
                    )}

                    {loading ? (
                        <div style={{ opacity: 0.5, fontWeight: 'bold', textTransform: 'uppercase' }}>Laden...</div>
                    ) : visible.length === 0 ? (
                        <div style={{
                            padding: 'var(--spacing-xl)', border: '2px dashed rgba(128,128,128,0.3)',
                            textAlign: 'center', opacity: 0.6, fontWeight: 'bold', textTransform: 'uppercase'
                        }}>
                            Nog geen projecten. Maak er één aan om te beginnen.
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--spacing-md)' }}>
                            {visible.map(project => {
                                const isRunning = timer?.project_id === project.id;
                                const isEditing = editingId === project.id;

                                return (
                                    <div
                                        key={project.id}
                                        style={{
                                            border: 'var(--brutalist-border)',
                                            borderLeft: `10px solid ${project.color}`,
                                            padding: 'var(--spacing-md)',
                                            background: 'var(--color-bg)',
                                            opacity: project.archived ? 0.55 : 1,
                                            display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)'
                                        }}
                                    >
                                        {isEditing ? (
                                            <>
                                                <input
                                                    type="text"
                                                    value={editName}
                                                    autoFocus
                                                    onChange={e => setEditName(e.target.value.slice(0, 50))}
                                                    onKeyDown={e => {
                                                        if (e.key === 'Enter') saveEdit();
                                                        if (e.key === 'Escape') setEditingId(null);
                                                    }}
                                                    style={inputStyle}
                                                />
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                                                    {PROJECT_COLORS.map(color => (
                                                        <button
                                                            key={color}
                                                            onClick={() => setEditColor(color)}
                                                            style={{
                                                                width: '22px', height: '22px', borderRadius: '2px', background: color,
                                                                border: editColor === color ? '3px solid var(--color-text)' : '2px solid transparent',
                                                                cursor: 'pointer', padding: 0
                                                            }}
                                                        />
                                                    ))}
                                                </div>
                                                <div style={{ display: 'flex', gap: '6px' }}>
                                                    <button
                                                        onClick={saveEdit}
                                                        style={{
                                                            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                                            background: 'var(--color-primary)', color: 'white', padding: '6px',
                                                            border: '2px solid var(--color-text)', cursor: 'pointer',
                                                            fontFamily: 'var(--font-heading)', textTransform: 'uppercase', fontSize: '0.75rem'
                                                        }}
                                                    >
                                                        <Check size={14} /> Opslaan
                                                    </button>
                                                    <button
                                                        onClick={() => setEditingId(null)}
                                                        style={{
                                                            display: 'flex', alignItems: 'center', padding: '6px 10px',
                                                            background: 'var(--color-bg)', color: 'var(--color-text)',
                                                            border: '2px solid var(--color-text)', cursor: 'pointer'
                                                        }}
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                                                    <button
                                                        onClick={() => startEdit(project)}
                                                        title="Naam en kleur aanpassen"
                                                        style={{
                                                            flex: 1, textAlign: 'left', background: 'transparent', border: 'none',
                                                            padding: 0, cursor: 'pointer', color: 'var(--color-text)',
                                                            fontFamily: 'var(--font-heading)', fontSize: '1.2rem',
                                                            textTransform: 'uppercase', lineHeight: 1.1, wordBreak: 'break-word'
                                                        }}
                                                    >
                                                        {project.name}
                                                    </button>
                                                    {project.archived && (
                                                        <span style={{
                                                            fontSize: '0.6rem', fontWeight: 'bold', textTransform: 'uppercase',
                                                            border: '2px solid var(--color-text)', padding: '1px 4px', flexShrink: 0
                                                        }}>
                                                            Archief
                                                        </span>
                                                    )}
                                                </div>

                                                <div style={{
                                                    fontFamily: 'var(--font-heading)', fontSize: '2rem',
                                                    color: project.color, lineHeight: 1
                                                }}>
                                                    {formatHours(project.total_hours)}
                                                </div>

                                                <div style={{
                                                    display: 'grid', gridTemplateColumns: '1fr 1fr',
                                                    gap: 'var(--spacing-sm)',
                                                    borderTop: '2px solid rgba(128,128,128,0.25)', paddingTop: 'var(--spacing-sm)'
                                                }}>
                                                    <Stat label="Sessies" value={String(project.sessions)} />
                                                    <Stat label="Gem. sessie" value={formatHours(project.avg_session)} />
                                                    <Stat label="Deze 7 dagen" value={formatHours(project.hours_last_7)} />
                                                    <Stat label="Deze 30 dagen" value={formatHours(project.hours_last_30)} />
                                                    <Stat label="Laatst gewerkt" value={project.last_worked || '—'} />
                                                </div>

                                                <div style={{ display: 'flex', gap: '6px', marginTop: 'auto', paddingTop: 'var(--spacing-sm)' }}>
                                                    <button
                                                        onClick={() => openStart(project.id)}
                                                        disabled={!!timer}
                                                        title={timer ? 'Er loopt al een timer' : 'Start een timer op dit project'}
                                                        style={{
                                                            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                                            background: isRunning ? 'var(--color-text)' : project.color, color: 'white',
                                                            padding: '8px', border: '2px solid var(--color-text)',
                                                            cursor: timer ? 'not-allowed' : 'pointer', opacity: timer ? 0.4 : 1,
                                                            fontFamily: 'var(--font-heading)', textTransform: 'uppercase', fontSize: '0.8rem'
                                                        }}
                                                    >
                                                        <Play size={14} />
                                                        {isRunning ? 'Loopt nu' : 'Start timer'}
                                                    </button>
                                                    <button
                                                        onClick={() => toggleArchived(project)}
                                                        title={project.archived ? 'Terughalen uit archief' : 'Archiveren (uren blijven bewaard)'}
                                                        style={{
                                                            display: 'flex', alignItems: 'center', padding: '8px',
                                                            background: 'var(--color-bg)', color: 'var(--color-text)',
                                                            border: '2px solid var(--color-text)', cursor: 'pointer'
                                                        }}
                                                    >
                                                        {project.archived ? <ArchiveRestore size={14} /> : <Archive size={14} />}
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(project)}
                                                        title="Verwijderen"
                                                        style={{
                                                            display: 'flex', alignItems: 'center', padding: '8px',
                                                            background: 'transparent', color: 'var(--color-text)',
                                                            border: '2px solid rgba(128,128,128,0.4)', cursor: 'pointer', opacity: 0.6
                                                        }}
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>

                <HypeButton />
            </div>
        </div>
    );
};

export default ProjectsPage;
