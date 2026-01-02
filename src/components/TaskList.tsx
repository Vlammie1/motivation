import React, { useState } from 'react';
import { TaskItem } from './TaskItem';
import { useSupabaseTasks } from '../hooks/useSupabaseTasks';
import { Loader2, ChevronDown, ChevronUp } from 'lucide-react';

interface TaskListProps {
    onTaskToggle?: (id: string, completed: boolean) => Promise<void>;
}

export const TaskList: React.FC<TaskListProps> = ({ onTaskToggle }) => {
    const { tasks, loading, addTask, toggleTask, deleteTask } = useSupabaseTasks();
    const [newTaskText, setNewTaskText] = useState('');
    const [newTaskWhy, setNewTaskWhy] = useState('');
    const [showCompleted, setShowCompleted] = useState(false);

    const activeTasks = tasks.filter(t => !t.completed);
    const completedTasks = tasks.filter(t => t.completed);

    const handleAddTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTaskText.trim()) return;

        await addTask(newTaskText, newTaskWhy);
        setNewTaskText('');
        setNewTaskWhy('');
    };

    const handleToggle = async (id: string, completed: boolean) => {
        if (onTaskToggle) {
            await onTaskToggle(id, completed);
        } else {
            await toggleTask(id, completed);
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--spacing-lg)' }}>
                <Loader2 className="animate-spin" />
            </div>
        );
    }

    return (
        <div style={{ width: '100%' }}>
            <h2 style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '2rem',
                borderBottom: 'var(--brutalist-border)',
                marginBottom: 'var(--spacing-md)'
            }}>
                THE GRIND
            </h2>

            <form onSubmit={handleAddTask} style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--spacing-sm)',
                marginBottom: 'var(--spacing-lg)',
                border: 'var(--brutalist-border)',
                padding: 'var(--spacing-md)',
                background: 'var(--color-secondary)',
            }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase' }}>Task</label>
                    <input
                        type="text"
                        value={newTaskText}
                        onChange={(e) => setNewTaskText(e.target.value)}
                        placeholder="WHAT MUST BE DONE?"
                        style={{
                            padding: 'var(--spacing-sm)',
                            border: '3px solid black', // Strong border
                            fontSize: '1.2rem',
                            fontFamily: 'var(--font-body)',
                            fontWeight: 'bold',
                            background: 'white',
                            color: 'black'
                        }}
                    />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase' }}>Motivation</label>
                    <input
                        type="text"
                        value={newTaskWhy}
                        onChange={(e) => setNewTaskWhy(e.target.value)}
                        placeholder="WHY? (THE MOTIVATION)"
                        style={{
                            padding: 'var(--spacing-sm)',
                            border: '2px solid black',
                            fontSize: '1rem',
                            fontFamily: 'var(--font-body)',
                            background: 'white',
                            color: 'black'
                        }}
                    />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--spacing-sm)' }}>
                    <button type="submit" style={{
                        background: 'var(--color-text)',
                        color: 'var(--color-bg)',
                        padding: 'var(--spacing-xs) var(--spacing-lg)',
                        fontSize: '1rem',
                        fontWeight: 'bold',
                        fontFamily: 'var(--font-heading)',
                        textTransform: 'uppercase',
                        cursor: 'pointer',
                        border: '2px solid var(--color-bg)',
                        maxWidth: '200px'
                    }}>
                        ADD TO LIST
                    </button>
                </div>
            </form>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                {activeTasks.length === 0 && completedTasks.length === 0 ? (
                    <div style={{ textAlign: 'center', opacity: 0.5, fontStyle: 'italic', padding: 'var(--spacing-lg)' }}>
                        SILENCE IS THE ENEMY OF PROGRESS. ADD A TASK.
                    </div>
                ) : (
                    <>
                        {activeTasks.map(task => (
                            <TaskItem
                                key={task.id}
                                task={{
                                    id: task.id,
                                    text: task.title,
                                    why: task.description,
                                    completed: task.completed
                                }}
                                onToggle={() => handleToggle(task.id, !task.completed)}
                                onDelete={() => deleteTask(task.id)}
                            />
                        ))}
                    </>
                )}
            </div>

            {completedTasks.length > 0 && (
                <div style={{ marginTop: 'var(--spacing-lg)', borderTop: '2px dashed var(--color-text)', paddingTop: 'var(--spacing-md)' }}>
                    <button
                        onClick={() => setShowCompleted(!showCompleted)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--spacing-sm)',
                            background: 'none',
                            border: 'none',
                            color: 'var(--color-text)',
                            fontWeight: 'bold',
                            textTransform: 'uppercase',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            opacity: 0.7
                        }}
                    >
                        {showCompleted ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        COMPLETED TASKS ({completedTasks.length})
                    </button>

                    {showCompleted && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-md)', opacity: 0.6 }}>
                            {completedTasks.map(task => (
                                <TaskItem
                                    key={task.id}
                                    task={{
                                        id: task.id,
                                        text: task.title,
                                        why: task.description,
                                        completed: task.completed
                                    }}
                                    onToggle={() => handleToggle(task.id, !task.completed)}
                                    onDelete={() => deleteTask(task.id)}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
