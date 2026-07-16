import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Columns3, List, Loader2, Lock, Play } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useProjects } from '../context/ProjectsContext';
import { useTimer } from '../context/TimerContext';
import { useSupabaseTasks } from '../hooks/useSupabaseTasks';
import useLocalStorage from '../hooks/useLocalStorage';
import { countTasks, STATUS_META, TASK_STATUSES } from '../lib/tasks';
import { TaskListView } from '../components/tasks/TaskListView';
import { TaskKanbanView } from '../components/tasks/TaskKanbanView';
import { ThemeSwitcher } from '../components/ThemeSwitcher';

type View = 'list' | 'kanban';

const ProjectDetailPage = () => {
    const { projectId } = useParams<{ projectId: string }>();
    const { user, loading: authLoading } = useAuth();
    const { projects, loading: projectsLoading } = useProjects();
    const { openStart, timer } = useTimer();
    const { tasks, loading: tasksLoading, addTask, updateTask, deleteTask } = useSupabaseTasks(projectId);
    const [view, setView] = useLocalStorage<View>('tasks-view', 'kanban');

    const project = projects.find(p => p.id === projectId);
    const counts = useMemo(() => countTasks(tasks), [tasks]);

    if (authLoading || projectsLoading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--spacing-xl)' }}>
                <Loader2 className="animate-spin" size={48} />
            </div>
        );
    }

    if (!user) {
        return (
            <div className="card" style={{ padding: 'var(--spacing-2xl)', textAlign: 'center', marginTop: 'var(--spacing-xl)' }}>
                <Lock size={32} style={{ marginBottom: 'var(--spacing-md)', color: 'var(--color-text-muted)' }} />
                <h2 style={{ marginBottom: 'var(--spacing-xs)', fontSize: 'var(--text-2xl)' }}>Access Denied</h2>
                <p className="muted" style={{ margin: 0 }}>Log in om je taken te beheren.</p>
            </div>
        );
    }

    if (!project) {
        return (
            <div className="card" style={{ padding: 'var(--spacing-2xl)', textAlign: 'center', marginTop: 'var(--spacing-xl)' }}>
                <h2 style={{ marginBottom: 'var(--spacing-xs)', fontSize: 'var(--text-2xl)' }}>Project niet gevonden</h2>
                <Link to="/projects" className="muted">Terug naar projecten</Link>
            </div>
        );
    }

    const isRunning = timer?.project_id === project.id;

    return (
        <div>
            <header style={{ marginBottom: 'var(--spacing-xl)' }}>
                <Link
                    to="/projects"
                    className="muted"
                    style={{
                        display: 'inline-flex', alignItems: 'center', gap: 'var(--spacing-2xs)',
                        fontSize: 'var(--text-sm)', marginBottom: 'var(--spacing-sm)'
                    }}
                >
                    <ArrowLeft size={14} /> Projecten
                </Link>

                <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                    gap: 'var(--spacing-md)', flexWrap: 'wrap'
                }}>
                    <div>
                        <h1 style={{
                            fontSize: 'var(--text-3xl)', marginBottom: 'var(--spacing-2xs)',
                            borderBottom: `3px solid ${project.color}`, display: 'inline-block'
                        }}>
                            {project.name}
                        </h1>
                        <p className="muted" style={{ margin: 0, fontSize: 'var(--text-sm)' }}>
                            {counts.total === 0
                                ? 'Nog geen taken'
                                : `${counts.open} open · ${counts.done} klaar · ${counts.total} totaal`}
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--spacing-xs)', alignItems: 'center' }}>
                        <ThemeSwitcher />
                        <button
                            className="btn-primary"
                            onClick={() => openStart(project.id)}
                            disabled={!!timer}
                            title={timer ? 'Er loopt al een timer' : 'Start een timer op dit project'}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)',
                                padding: 'var(--spacing-xs) var(--spacing-md)'
                            }}
                        >
                            <Play size={16} />
                            {isRunning ? 'Loopt nu' : 'Start timer'}
                        </button>
                    </div>
                </div>
            </header>

            <section className="card">
                <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    gap: 'var(--spacing-md)', flexWrap: 'wrap', marginBottom: 'var(--spacing-lg)'
                }}>
                    <div role="group" aria-label="Weergave" style={{
                        display: 'flex', gap: '2px', padding: '2px',
                        background: 'var(--color-muted)', border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-md)'
                    }}>
                        {([['list', 'Overzicht', List], ['kanban', 'Kanban', Columns3]] as const).map(([id, label, Icon]) => (
                            <button
                                key={id}
                                onClick={() => setView(id)}
                                aria-pressed={view === id}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 'var(--spacing-2xs)',
                                    padding: 'var(--spacing-2xs) var(--spacing-xs)',
                                    background: view === id ? 'var(--color-bg)' : 'transparent',
                                    color: view === id ? 'var(--color-text)' : 'var(--color-text-muted)',
                                    border: '1px solid transparent', borderRadius: 'var(--radius-sm)',
                                    fontSize: 'var(--text-xs)', fontWeight: 600, cursor: 'pointer'
                                }}
                            >
                                <Icon size={14} /> {label}
                            </button>
                        ))}
                    </div>

                    <div style={{ display: 'flex', gap: 'var(--spacing-xs)', flexWrap: 'wrap' }}>
                        {TASK_STATUSES.map(s => (
                            <span key={s} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: 'var(--text-xs)' }}>
                                <span style={{
                                    width: '8px', height: '8px', borderRadius: 'var(--radius-full)',
                                    background: STATUS_META[s].color
                                }} />
                                <span className="muted">{STATUS_META[s].label}</span>
                                <strong>{counts[s]}</strong>
                            </span>
                        ))}
                    </div>
                </div>

                {tasksLoading ? (
                    <div className="muted">Taken laden…</div>
                ) : view === 'list' ? (
                    <TaskListView tasks={tasks} onAdd={addTask} onUpdate={updateTask} onDelete={deleteTask} />
                ) : (
                    <TaskKanbanView tasks={tasks} onAdd={addTask} onUpdate={updateTask} onDelete={deleteTask} />
                )}
            </section>
        </div>
    );
};

export default ProjectDetailPage;
