import { useState, useEffect } from 'react';
import { FolderOpen, X } from 'lucide-react';
import { ProjectsModal } from './ProjectsModal';
import type { ProjectWithHours } from '../hooks/useSupabaseProjects';

interface WorkLogFormProps {
    date: string;
    currentHours: number;
    currentSessions: number;
    onAdd: (date: string, hours: number, note?: string, projectId?: string) => void;
    getProjectsWithHours: () => Promise<ProjectWithHours[]>;
    addProject: (name: string, color: string) => Promise<any>;
    deleteProject: (id: string) => Promise<void>;
}

export const WorkLogForm = ({
    date,
    currentHours,
    currentSessions,
    onAdd,
    getProjectsWithHours,
    addProject,
    deleteProject
}: WorkLogFormProps) => {
    const [hours, setHours] = useState<string>('');
    const [note, setNote] = useState<string>('');
    const [selectedProject, setSelectedProject] = useState<{ id: string; name: string; color: string } | null>(null);
    const [showProjectsModal, setShowProjectsModal] = useState(false);

    useEffect(() => {
        setHours('');
        setNote('');
        setSelectedProject(null);
    }, [date]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const h = parseFloat(hours);
        if (!isNaN(h) && h > 0 && h <= 24) {
            onAdd(date, h, note.trim() || undefined, selectedProject?.id || undefined);
            setHours('');
            setNote('');
            setSelectedProject(null);
        }
    };

    const handleProjectSelect = (project: { id: string; name: string; color: string }) => {
        setSelectedProject(project);
        setShowProjectsModal(false);
    };

    return (
        <>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                {currentHours > 0 && (
                    <div style={{
                        padding: 'var(--spacing-sm) var(--spacing-md)',
                        border: '3px solid var(--color-primary)',
                        background: 'rgba(var(--color-primary-rgb, 0,0,0), 0.05)',
                        fontWeight: 'bold',
                        fontSize: '0.9rem',
                        textTransform: 'uppercase'
                    }}>
                        Today: <span style={{ color: 'var(--color-primary)', fontSize: '1.1rem' }}>{currentHours.toFixed(1)}h</span>
                        {currentSessions > 0 && <span style={{ opacity: 0.6, marginLeft: '8px' }}>({currentSessions} session{currentSessions !== 1 ? 's' : ''})</span>}
                    </div>
                )}

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-md)', alignItems: 'flex-end' }}>
                    <div style={{ flex: '0 0 auto', minWidth: '200px' }}>
                        <label style={{ display: 'block', textTransform: 'uppercase', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '4px' }}>
                            Date
                        </label>
                        <div style={{
                            padding: 'var(--spacing-sm)',
                            border: 'var(--brutalist-border)',
                            background: 'var(--color-bg)',
                            color: 'var(--color-text)',
                            fontFamily: 'var(--font-heading)',
                            fontWeight: 'bold',
                            opacity: 0.8
                        }}>
                            {date}
                        </div>
                    </div>

                    <div style={{ flex: '0 0 auto', minWidth: '150px' }}>
                        <label htmlFor="hours-input" style={{ display: 'block', textTransform: 'uppercase', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '4px' }}>
                            Hours This Session
                        </label>
                        <input
                            id="hours-input"
                            type="number"
                            step="0.5"
                            min="0.5"
                            max="24"
                            value={hours}
                            placeholder="0"
                            onChange={(e) => setHours(e.target.value)}
                            style={{
                                width: '100%',
                                padding: 'var(--spacing-sm)',
                                border: 'var(--brutalist-border)',
                                fontSize: '1.2rem',
                                fontFamily: 'var(--font-heading)',
                                outline: 'none',
                                background: 'var(--color-bg)',
                                color: 'var(--color-text)'
                            }}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={!hours || parseFloat(hours) <= 0}
                        style={{
                            background: 'var(--color-primary)',
                            color: 'white',
                            padding: 'var(--spacing-sm) var(--spacing-xl)',
                            fontSize: '1.1rem',
                            fontWeight: 'bold',
                            fontFamily: 'var(--font-heading)',
                            textTransform: 'uppercase',
                            border: 'var(--brutalist-border)',
                            cursor: 'pointer',
                            boxShadow: '4px 4px 0px var(--color-text)',
                            height: '46px',
                            opacity: (!hours || parseFloat(hours) <= 0) ? 0.5 : 1
                        }}
                        onMouseDown={e => e.currentTarget.style.boxShadow = 'none'}
                        onMouseUp={e => e.currentTarget.style.boxShadow = '4px 4px 0px var(--color-text)'}
                    >
                        + Add Session
                    </button>
                </div>

                <div>
                    <label htmlFor="note-input" style={{ display: 'block', textTransform: 'uppercase', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '4px' }}>
                        Note <span style={{ opacity: 0.5, textTransform: 'none', fontWeight: 'normal' }}>(optional)</span>
                    </label>
                    <textarea
                        id="note-input"
                        value={note}
                        onChange={(e) => setNote(e.target.value.slice(0, 200))}
                        placeholder="Waar heb je aan gewerkt?"
                        rows={2}
                        style={{
                            width: '100%',
                            padding: 'var(--spacing-sm)',
                            border: 'var(--brutalist-border)',
                            fontSize: '0.95rem',
                            fontFamily: 'var(--font-mono)',
                            outline: 'none',
                            resize: 'vertical',
                            background: 'var(--color-bg)',
                            color: 'var(--color-text)',
                            boxSizing: 'border-box'
                        }}
                    />
                    <div style={{ fontSize: '0.7rem', opacity: 0.5, textAlign: 'right', marginTop: '2px' }}>
                        {note.length}/200
                    </div>
                </div>

                {/* Project Selector */}
                <div>
                    <label style={{ display: 'block', textTransform: 'uppercase', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '4px' }}>
                        Project <span style={{ opacity: 0.5, textTransform: 'none', fontWeight: 'normal' }}>(optional)</span>
                    </label>

                    {selectedProject ? (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: 'var(--spacing-sm)',
                            border: 'var(--brutalist-border)',
                            background: 'var(--color-bg)',
                        }}>
                            <div style={{
                                width: '12px',
                                height: '12px',
                                borderRadius: '2px',
                                background: selectedProject.color,
                                border: '2px solid var(--color-text)',
                                flexShrink: 0
                            }} />
                            <span style={{
                                flex: 1,
                                fontWeight: 'bold',
                                fontSize: '0.95rem',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                            }}>
                                {selectedProject.name}
                            </span>
                            <button
                                type="button"
                                onClick={() => setSelectedProject(null)}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: 'var(--color-text)',
                                    opacity: 0.4,
                                    padding: '2px',
                                    display: 'flex',
                                    alignItems: 'center'
                                }}
                                onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                                onMouseLeave={e => (e.currentTarget.style.opacity = '0.4')}
                                title="Project verwijderen"
                            >
                                <X size={16} />
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowProjectsModal(true)}
                                style={{
                                    background: 'transparent',
                                    border: '2px solid var(--color-text)',
                                    cursor: 'pointer',
                                    color: 'var(--color-text)',
                                    padding: '2px 8px',
                                    fontSize: '0.75rem',
                                    fontWeight: 'bold',
                                    textTransform: 'uppercase',
                                    fontFamily: 'var(--font-heading)',
                                }}
                            >
                                Wijzig
                            </button>
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={() => setShowProjectsModal(true)}
                            style={{
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: 'var(--spacing-sm)',
                                border: 'var(--brutalist-border)',
                                background: 'var(--color-bg)',
                                color: 'var(--color-text)',
                                cursor: 'pointer',
                                fontSize: '0.9rem',
                                fontFamily: 'var(--font-heading)',
                                opacity: 0.6,
                                textAlign: 'left',
                                boxSizing: 'border-box'
                            }}
                            onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                            onMouseLeave={e => (e.currentTarget.style.opacity = '0.6')}
                        >
                            <FolderOpen size={16} />
                            Project toewijzen...
                        </button>
                    )}
                </div>
            </form>

            {showProjectsModal && (
                <ProjectsModal
                    onClose={() => setShowProjectsModal(false)}
                    onSelectProject={handleProjectSelect}
                    getProjectsWithHours={getProjectsWithHours}
                    addProject={addProject}
                    deleteProject={deleteProject}
                />
            )}
        </>
    );
};
