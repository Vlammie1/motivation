import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Archive, ArchiveRestore, Check, ListChecks, Lock, Pencil, Play, Plus, Trash2, X, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useProjects } from '../context/ProjectsContext';
import { useTimer } from '../context/TimerContext';
import type { ProjectStats } from '../hooks/useSupabaseProjects';
import { PROJECT_COLORS, DEFAULT_PROJECT_COLOR } from '../lib/projectColors';
import { STATUS_META, TASK_STATUSES } from '../lib/tasks';
import { formatHours } from '../lib/time';
import { ThemeSwitcher } from '../components/ThemeSwitcher';
import { HypeButton } from '../components/HypeButton';

const sectionStyle: React.CSSProperties = {
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    padding: 'var(--spacing-lg)',
    background: 'var(--color-bg)',
};

const inputStyle: React.CSSProperties = {
    width: '100%',
    boxSizing: 'border-box'
};

const Stat = ({ label, value }: { label: string; value: string }) => (
    <div>
        <div className="label" style={{ marginBottom: 0 }}>{label}</div>
        <div style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-base)' }}>{value}</div>
    </div>
);

/** Hoeveel taken er per status openstaan, met de link naar het takenbord. */
const TaskSummary = ({ project }: { project: ProjectStats }) => (
    <Link
        to={`/projects/${project.id}`}
        title="Taken beheren"
        style={{
            display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', flexWrap: 'wrap',
            borderTop: '1px solid var(--color-border)', paddingTop: 'var(--spacing-sm)',
            color: 'var(--color-text)', textDecoration: 'none', fontSize: 'var(--text-xs)'
        }}
    >
        <ListChecks size={14} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
        {project.tasks.total === 0 ? (
            <span className="muted">Nog geen taken</span>
        ) : (
            <>
                {TASK_STATUSES.map(s => (
                    <span key={s} style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <span style={{
                            width: '7px', height: '7px', borderRadius: 'var(--radius-full)',
                            background: STATUS_META[s].color
                        }} />
                        <strong>{project.tasks[s]}</strong>
                    </span>
                ))}
                <span className="muted" style={{ marginLeft: 'auto' }}>{project.tasks.open} open</span>
            </>
        )}
    </Link>
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
            <header style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: 'var(--spacing-md)',
                marginBottom: 'var(--spacing-xl)',
                flexWrap: 'wrap'
            }}>
                <div>
                    <h1 style={{ fontSize: 'var(--text-3xl)', marginBottom: 'var(--spacing-2xs)' }}>
                        Projecten
                    </h1>
                    <p className="muted" style={{ margin: 0, fontSize: 'var(--text-sm)' }}>
                        {stats.length} projecten · {formatHours(totalHours)} totaal
                    </p>
                </div>
                <ThemeSwitcher />
            </header>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xl)' }}>
                <section style={sectionStyle}>
                    <div style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        gap: 'var(--spacing-md)', flexWrap: 'wrap', marginBottom: 'var(--spacing-lg)'
                    }}>
                        <h2 className="card-title" style={{ margin: 0 }}>Overzicht</h2>
                        <div style={{ display: 'flex', gap: 'var(--spacing-xs)', flexWrap: 'wrap' }}>
                            {archivedCount > 0 && (
                                <button
                                    onClick={() => setShowArchived(v => !v)}
                                    aria-pressed={showArchived}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 'var(--spacing-2xs)',
                                        padding: 'var(--spacing-xs) var(--spacing-sm)',
                                        background: showArchived ? 'var(--color-surface-2)' : 'var(--color-bg)',
                                        borderColor: showArchived ? 'var(--color-text-muted)' : 'var(--color-border-strong)',
                                        fontSize: 'var(--text-sm)', fontWeight: 600
                                    }}
                                >
                                    <Archive size={14} />
                                    {showArchived ? 'Verberg' : 'Toon'} archief ({archivedCount})
                                </button>
                            )}
                            <button
                                onClick={() => setShowAdd(v => !v)}
                                className="btn-primary"
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 'var(--spacing-2xs)',
                                    padding: 'var(--spacing-xs) var(--spacing-sm)',
                                    fontSize: 'var(--text-sm)'
                                }}
                            >
                                <Plus size={14} />
                                Nieuw project
                            </button>
                        </div>
                    </div>

                    {showAdd && (
                        <div style={{
                            border: '1px dashed var(--color-border-strong)', padding: 'var(--spacing-md)',
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
                                            border: newColor === color ? '1px solid var(--color-border-strong)' : '2px solid transparent',
                                            outline: newColor === color ? '1px solid var(--color-primary)' : 'none',
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
                            padding: 'var(--spacing-xl)', border: '1px dashed var(--color-border-strong)',
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
                                                                border: editColor === color ? '1px solid var(--color-border-strong)' : '2px solid transparent',
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
                                                            border: '1px solid var(--color-border-strong)', cursor: 'pointer',
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
                                                            border: '1px solid var(--color-border-strong)', cursor: 'pointer'
                                                        }}
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                                                    <Link
                                                        to={`/projects/${project.id}`}
                                                        title="Taken van dit project beheren"
                                                        style={{
                                                            flex: 1, textAlign: 'left', color: 'var(--color-text)',
                                                            fontFamily: 'var(--font-heading)', fontSize: '1.2rem',
                                                            textTransform: 'uppercase', lineHeight: 1.1, wordBreak: 'break-word',
                                                            textDecoration: 'none'
                                                        }}
                                                    >
                                                        {project.name}
                                                    </Link>
                                                    {project.archived && (
                                                        <span style={{
                                                            fontSize: '0.6rem', fontWeight: 'bold', textTransform: 'uppercase',
                                                            border: '1px solid var(--color-border-strong)', padding: '1px 4px', flexShrink: 0
                                                        }}>
                                                            Archief
                                                        </span>
                                                    )}
                                                    <button
                                                        onClick={() => startEdit(project)}
                                                        title="Naam en kleur aanpassen"
                                                        style={{
                                                            display: 'flex', alignItems: 'center', padding: '2px', flexShrink: 0,
                                                            background: 'transparent', border: '1px solid transparent',
                                                            color: 'var(--color-text-muted)', cursor: 'pointer'
                                                        }}
                                                    >
                                                        <Pencil size={14} />
                                                    </button>
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
                                                    borderTop: '1px solid var(--color-border)', paddingTop: 'var(--spacing-sm)'
                                                }}>
                                                    <Stat label="Sessies" value={String(project.sessions)} />
                                                    <Stat label="Gem. sessie" value={formatHours(project.avg_session)} />
                                                    <Stat label="Deze 7 dagen" value={formatHours(project.hours_last_7)} />
                                                    <Stat label="Deze 30 dagen" value={formatHours(project.hours_last_30)} />
                                                    <Stat label="Laatst gewerkt" value={project.last_worked || '—'} />
                                                </div>

                                                <TaskSummary project={project} />

                                                <div style={{ display: 'flex', gap: 'var(--spacing-2xs)', marginTop: 'auto', paddingTop: 'var(--spacing-sm)' }}>
                                                    <button
                                                        onClick={() => openStart(project.id)}
                                                        disabled={!!timer}
                                                        title={timer ? 'Er loopt al een timer' : 'Start een timer op dit project'}
                                                        style={{
                                                            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            gap: 'var(--spacing-2xs)',
                                                            // Loopt de timer al, dan blijft dit een leesbare, uitgeschakelde knop
                                                            // in plaats van witte tekst op een witte vlakte.
                                                            background: isRunning ? 'var(--color-surface-2)' : project.color,
                                                            color: isRunning ? 'var(--color-text)' : 'var(--color-on-primary)',
                                                            border: isRunning ? '1px solid var(--color-border-strong)' : '1px solid transparent',
                                                            padding: 'var(--spacing-xs)',
                                                            fontSize: 'var(--text-sm)', fontWeight: 600
                                                        }}
                                                    >
                                                        <Play size={14} />
                                                        {isRunning ? 'Loopt nu' : 'Start timer'}
                                                    </button>
                                                    <button
                                                        onClick={() => toggleArchived(project)}
                                                        title={project.archived ? 'Terughalen uit archief' : 'Archiveren (uren blijven bewaard)'}
                                                        style={{
                                                            display: 'flex', alignItems: 'center', padding: 'var(--spacing-xs)',
                                                            color: 'var(--color-text-muted)',
                                                        }}
                                                    >
                                                        {project.archived ? <ArchiveRestore size={14} /> : <Archive size={14} />}
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(project)}
                                                        title="Verwijderen"
                                                        style={{
                                                            display: 'flex', alignItems: 'center', padding: 'var(--spacing-xs)',
                                                            color: 'var(--color-text-muted)',
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
