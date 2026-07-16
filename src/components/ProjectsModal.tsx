import { useState, useEffect } from 'react';
import { X, Plus, Trash2, FolderOpen, Clock } from 'lucide-react';
import type { ProjectWithHours } from '../hooks/useSupabaseProjects';

interface ProjectsModalProps {
    onClose: () => void;
    onSelectProject: (project: { id: string; name: string; color: string }) => void;
    getProjectsWithHours: () => Promise<ProjectWithHours[]>;
    addProject: (name: string, color: string) => Promise<any>;
    deleteProject: (id: string) => Promise<void>;
}

const PROJECT_COLORS = [
    '#FF6B00', '#E91E63', '#9C27B0', '#673AB7',
    '#3F51B5', '#2196F3', '#00BCD4', '#009688',
    '#4CAF50', '#8BC34A', '#FF9800', '#795548',
];

export const ProjectsModal = ({
    onClose,
    onSelectProject,
    getProjectsWithHours,
    addProject,
    deleteProject
}: ProjectsModalProps) => {
    const [projects, setProjects] = useState<ProjectWithHours[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newName, setNewName] = useState('');
    const [newColor, setNewColor] = useState('#FF6B00');
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const loadProjects = async () => {
        setLoading(true);
        const data = await getProjectsWithHours();
        setProjects(data);
        setLoading(false);
    };

    useEffect(() => {
        loadProjects();
    }, []);

    const handleAdd = async () => {
        const trimmed = newName.trim();
        if (!trimmed) return;

        const created = await addProject(trimmed, newColor);
        if (created) {
            setNewName('');
            setNewColor('#FF6B00');
            setShowAddForm(false);
            await loadProjects();
        }
    };

    const handleDelete = async (id: string) => {
        setDeletingId(id);
        await deleteProject(id);
        setProjects(prev => prev.filter(p => p.id !== id));
        setDeletingId(null);
    };

    const formatHours = (h: number) => {
        if (h === 0) return '0h';
        if (h < 1) return `${(h * 60).toFixed(0)}m`;
        return `${h.toFixed(1)}h`;
    };

    return (
        <div className="modal-overlay" style={{ zIndex: 1100 }} onClick={onClose}>
            <div
                className="modal-panel"
                style={{ maxWidth: '480px', padding: 0 }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                    padding: 'var(--spacing-lg)',
                    borderBottom: '1px solid var(--color-border)',
                }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                            <FolderOpen size={17} />
                            <h2 style={{ margin: 0, fontSize: 'var(--text-lg)' }}>
                                Projecten
                            </h2>
                        </div>
                        <div className="muted" style={{ fontSize: 'var(--text-xs)', marginTop: 'var(--spacing-2xs)' }}>
                            Gerankt op totale uren
                        </div>
                    </div>
                    <button className="modal-close" onClick={onClose} aria-label="Sluiten">
                        <X size={18} />
                    </button>
                </div>

                {/* Project List */}
                <div style={{ padding: 'var(--spacing-md) var(--spacing-lg)' }}>
                    {loading ? (
                        <div style={{ opacity: 0.5, fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.85rem', padding: 'var(--spacing-md) 0' }}>
                            Laden...
                        </div>
                    ) : projects.length === 0 && !showAddForm ? (
                        <div style={{
                            padding: 'var(--spacing-lg)',
                            border: '1px dashed var(--color-border-strong)',
                            textAlign: 'center',
                            opacity: 0.6,
                            fontSize: '0.9rem',
                            fontWeight: 'bold',
                            textTransform: 'uppercase'
                        }}>
                            Nog geen projecten.
                            <br />
                            <span style={{ fontSize: '0.8rem', fontWeight: 'normal', textTransform: 'none' }}>
                                Maak je eerste project aan!
                            </span>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                            {projects.map((project, index) => (
                                <div
                                    key={project.id}
                                    style={{
                                        border: '1px solid var(--color-border)',
                                        borderRadius: 'var(--radius-md)',
                                        padding: 'var(--spacing-sm) var(--spacing-md)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 'var(--spacing-sm)',
                                        cursor: 'pointer',
                                        background: 'var(--color-bg)',
                                        transition: 'background-color var(--transition-fast)',
                                    }}
                                    onClick={() => onSelectProject({ id: project.id, name: project.name, color: project.color })}
                                    onMouseEnter={e => {
                                        e.currentTarget.style.background = 'var(--color-surface-2)';
                                    }}
                                    onMouseLeave={e => {
                                        e.currentTarget.style.background = 'var(--color-bg)';
                                    }}
                                >
                                    {/* Rank */}
                                    <span style={{
                                        fontFamily: 'var(--font-heading)',
                                        fontSize: '0.75rem',
                                        opacity: 0.4,
                                        minWidth: '20px',
                                        textAlign: 'center'
                                    }}>
                                        #{index + 1}
                                    </span>

                                    {/* Color dot */}
                                    <div style={{
                                        width: '14px',
                                        height: '14px',
                                        borderRadius: '2px',
                                        background: project.color,
                                        border: '1px solid var(--color-border-strong)',
                                        flexShrink: 0
                                    }} />

                                    {/* Name */}
                                    <span style={{
                                        flex: 1,
                                        fontWeight: 'bold',
                                        fontSize: '0.95rem',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap'
                                    }}>
                                        {project.name}
                                    </span>

                                    {/* Hours */}
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        fontFamily: 'var(--font-heading)',
                                        fontSize: '1rem',
                                        color: project.total_hours > 0 ? 'var(--color-primary)' : 'var(--color-text)',
                                        opacity: project.total_hours > 0 ? 1 : 0.3,
                                        flexShrink: 0
                                    }}>
                                        <Clock size={14} />
                                        {formatHours(project.total_hours)}
                                    </div>

                                    {/* Delete */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDelete(project.id);
                                        }}
                                        disabled={deletingId === project.id}
                                        style={{
                                            background: 'transparent',
                                            border: 'none',
                                            cursor: 'pointer',
                                            color: 'var(--color-text)',
                                            opacity: deletingId === project.id ? 0.2 : 0.3,
                                            padding: '4px',
                                            flexShrink: 0,
                                            transition: 'opacity 0.15s'
                                        }}
                                        onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                                        onMouseLeave={e => (e.currentTarget.style.opacity = deletingId === project.id ? '0.2' : '0.3')}
                                        title="Verwijder project"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Add Form */}
                <div style={{
                    padding: 'var(--spacing-md) var(--spacing-lg)',
                    borderTop: 'var(--brutalist-border)'
                }}>
                    {showAddForm ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                            <label style={{
                                display: 'block',
                                textTransform: 'uppercase',
                                fontSize: '0.75rem',
                                fontWeight: 'bold',
                                marginBottom: '2px'
                            }}>
                                Nieuw Project
                            </label>
                            <input
                                type="text"
                                value={newName}
                                onChange={e => setNewName(e.target.value.slice(0, 50))}
                                placeholder="Projectnaam..."
                                autoFocus
                                onKeyDown={e => {
                                    if (e.key === 'Enter') handleAdd();
                                    if (e.key === 'Escape') {
                                        setShowAddForm(false);
                                        setNewName('');
                                    }
                                }}
                                style={{
                                    width: '100%',
                                    padding: 'var(--spacing-sm)',
                                    border: 'var(--brutalist-border)',
                                    fontSize: '0.95rem',
                                    fontFamily: 'var(--font-heading)',
                                    outline: 'none',
                                    background: 'var(--color-bg)',
                                    color: 'var(--color-text)',
                                    boxSizing: 'border-box'
                                }}
                            />

                            {/* Color Picker */}
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {PROJECT_COLORS.map(color => (
                                    <button
                                        key={color}
                                        onClick={() => setNewColor(color)}
                                        style={{
                                            width: '28px',
                                            height: '28px',
                                            borderRadius: '2px',
                                            background: color,
                                            border: newColor === color ? '1px solid var(--color-border-strong)' : '2px solid transparent',
                                            cursor: 'pointer',
                                            outline: newColor === color ? '1px solid var(--color-primary)' : 'none',
                                            padding: 0
                                        }}
                                    />
                                ))}
                            </div>

                            <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                                <button
                                    onClick={handleAdd}
                                    disabled={!newName.trim()}
                                    style={{
                                        flex: 1,
                                        background: 'var(--color-primary)',
                                        color: 'white',
                                        padding: 'var(--spacing-sm)',
                                        fontSize: '0.9rem',
                                        fontWeight: 'bold',
                                        fontFamily: 'var(--font-heading)',
                                        textTransform: 'uppercase',
                                        border: 'var(--brutalist-border)',
                                        cursor: 'pointer',

                                        opacity: !newName.trim() ? 0.5 : 1
                                    }}
                                >
                                    Opslaan
                                </button>
                                <button
                                    onClick={() => { setShowAddForm(false); setNewName(''); }}
                                    style={{
                                        background: 'var(--color-bg)',
                                        color: 'var(--color-text)',
                                        padding: 'var(--spacing-sm)',
                                        fontSize: '0.9rem',
                                        fontWeight: 'bold',
                                        fontFamily: 'var(--font-heading)',
                                        textTransform: 'uppercase',
                                        border: 'var(--brutalist-border)',
                                        cursor: 'pointer',
                                    }}
                                >
                                    Annuleer
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button
                            onClick={() => setShowAddForm(true)}
                            style={{
                                width: '100%',
                                background: 'var(--color-bg)',
                                color: 'var(--color-text)',
                                padding: 'var(--spacing-sm)',
                                fontSize: '0.9rem',
                                fontWeight: 'bold',
                                fontFamily: 'var(--font-heading)',
                                textTransform: 'uppercase',
                                border: 'var(--brutalist-border)',
                                cursor: 'pointer',

                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px'
                            }}
                        >
                            <Plus size={18} />
                            Nieuw Project
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
