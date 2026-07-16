import { useState, useEffect } from 'react';
import { FolderOpen, X, Sparkles, Loader2, Plus } from 'lucide-react';
import { generateGeminiContent } from '../lib/gemini';
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
    const [isImproving, setIsImproving] = useState(false);
    const [showAIPopover, setShowAIPopover] = useState(false);
    const [aiDraft, setAiDraft] = useState('');
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

    const handleAIImprove = async () => {
        if (!aiDraft.trim()) return;
        
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
        if (!apiKey) {
            alert('Voeg VITE_GEMINI_API_KEY toe aan je .env bestand!');
            return;
        }

        setIsImproving(true);
        const prompt = `Verbeter de volgende notitie voor een timetracker om het professioneler en duidelijker te maken. Houd het kort en krachtig (max 500 tekens). Antwoord ALLEEN met de verbeterde tekst, geen inleiding of afsluiting.
        Concept: "${aiDraft}"`;

        const result = await generateGeminiContent(prompt, apiKey);
        if (result.error) {
            alert(`AI Fout: ${result.error}`);
        } else if (result.text) {
            setNote(result.text.trim().slice(0, 500));
            setShowAIPopover(false);
            setAiDraft('');
        }
        setIsImproving(false);
    };

    return (
        <>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                {currentHours > 0 && (
                    <div style={{
                        padding: 'var(--spacing-sm) var(--spacing-md)',
                        border: '1px solid var(--color-primary)',
                        background: 'rgba(var(--color-primary-rgb, 0,0,0), 0.05)',
                        fontWeight: 'bold',
                        fontSize: '0.9rem',
                        textTransform: 'uppercase'
                    }}>
                        Today: <span style={{ color: 'var(--color-primary)', fontSize: '1.1rem' }}>{currentHours.toFixed(1)}h</span>
                        {currentSessions > 0 && <span style={{ opacity: 0.6, marginLeft: '8px' }}>({currentSessions} session{currentSessions !== 1 ? 's' : ''})</span>}
                    </div>
                )}

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-sm)', alignItems: 'flex-start' }}>
                    <div style={{ flex: '0 0 auto', minWidth: '160px' }}>
                        <span className="label">Datum</span>
                        <div style={{
                            padding: 'var(--spacing-xs) var(--spacing-sm)',
                            border: '1px solid var(--color-border)',
                            borderRadius: 'var(--radius-md)',
                            background: 'var(--color-surface-2)',
                            color: 'var(--color-text-muted)',
                            fontFamily: 'var(--font-heading)',
                        }}>
                            {date}
                        </div>
                    </div>

                    <div style={{ flex: '0 0 auto', minWidth: '130px' }}>
                        <label className="label" htmlFor="hours-input">
                            Uren deze sessie
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
                                fontSize: 'var(--text-lg)',
                                fontFamily: 'var(--font-heading)',
                            }}
                        />
                    </div>

                    <div>
                        {/* Onzichtbaar label houdt de knop op één lijn met de inputs. */}
                        <span className="label" aria-hidden="true">&nbsp;</span>
                        <button
                            type="submit"
                            disabled={!hours || parseFloat(hours) <= 0}
                            className="btn-primary"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 'var(--spacing-2xs)',
                                padding: 'var(--spacing-xs) var(--spacing-md)',
                            }}
                        >
                            <Plus size={16} /> Sessie toevoegen
                        </button>
                    </div>
                </div>

                <div style={{ position: 'relative' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <label className="label" htmlFor="note-input" style={{ marginBottom: 0 }}>
                            Notitie <span style={{ textTransform: 'none', fontWeight: 400 }}>(optioneel)</span>
                        </label>
                        <button
                            type="button"
                            onClick={() => setShowAIPopover(!showAIPopover)}
                            title="AI Schrijfhulp"
                            style={{
                                background: 'none',
                                border: 'none',
                                boxShadow: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px',
                                color: 'var(--color-primary)',
                                fontSize: 'var(--text-xs)',
                                fontWeight: 600,
                                padding: 'var(--spacing-2xs)',
                            }}
                        >
                            <Sparkles size={12} />
                            AI Hulp
                        </button>
                    </div>

                    {showAIPopover && (
                        <div style={{
                            position: 'absolute',
                            top: '100%',
                            right: 0,
                            width: '280px',
                            background: 'var(--color-bg)',
                            border: '1px solid var(--color-border-strong)',

                            padding: '12px',
                            zIndex: 10,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                            marginTop: '4px'
                        }}>
                            <div style={{ fontSize: '0.7rem', fontWeight: '900', textTransform: 'uppercase' }}>AI Verbeteraar</div>
                            <textarea
                                value={aiDraft}
                                onChange={(e) => setAiDraft(e.target.value.slice(0, 500))}
                                placeholder="Typ hier kort wat je deed..."
                                rows={3}
                                style={{
                                    width: '100%',
                                    padding: '8px',
                                    border: '1px solid var(--color-border-strong)',
                                    fontSize: '0.85rem',
                                    fontFamily: 'var(--font-mono)',
                                    resize: 'none',
                                    boxSizing: 'border-box'
                                }}
                            />
                            <button
                                onClick={handleAIImprove}
                                disabled={isImproving || !aiDraft.trim()}
                                style={{
                                    background: 'var(--color-primary)',
                                    color: 'white',
                                    border: '1px solid var(--color-border-strong)',
                                    padding: '6px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px'
                                }}
                            >
                                {isImproving ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                                Verbeter & Gebruik
                            </button>
                        </div>
                    )}

                    <textarea
                        id="note-input"
                        value={note}
                        onChange={(e) => setNote(e.target.value.slice(0, 500))}
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
                        {note.length}/500
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
                                border: '1px solid var(--color-border-strong)',
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
                                    border: '1px solid var(--color-border-strong)',
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
