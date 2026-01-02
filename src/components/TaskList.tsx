import React, { useState } from 'react';
import { TaskItem } from './TaskItem';
import { useSupabaseTasks } from '../hooks/useSupabaseTasks';
import { Loader2 } from 'lucide-react';

interface TaskListProps {
    onTaskToggle?: (id: string, completed: boolean) => Promise<void>;
}

export const TaskList: React.FC<TaskListProps> = ({ onTaskToggle }) => {
    const { tasks, loading, addTask, toggleTask, deleteTask } = useSupabaseTasks();
    const [newTaskText, setNewTaskText] = useState('');
    const [newTaskWhy, setNewTaskWhy] = useState('');

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
                padding: 'var(--spacing-sm)',
                background: 'var(--color-secondary)',
            }}>
                <input
                    type="text"
                    value={newTaskText}
                    onChange={(e) => setNewTaskText(e.target.value)}
                    placeholder="WHAT MUST BE DONE?"
                    style={{
                        padding: 'var(--spacing-sm)',
                        border: 'var(--brutalist-border)',
                        fontSize: '1.2rem',
                        fontFamily: 'var(--font-body)',
                        fontWeight: 'bold',
                        background: 'white',
                        color: 'black'
                    }}
                />
                <input
                    type="text"
                    value={newTaskWhy}
                    onChange={(e) => setNewTaskWhy(e.target.value)}
                    placeholder="WHY? (THE MOTIVATION)"
                    style={{
                        padding: 'var(--spacing-sm)',
                        border: 'var(--brutalist-border)',
                        fontSize: '1rem',
                        fontFamily: 'var(--font-body)',
                        background: 'white',
                        color: 'black'
                    }}
                />
                <button type="submit" style={{
                    background: 'var(--color-text)',
                    color: 'var(--color-bg)',
                    padding: 'var(--spacing-sm)',
                    fontSize: '1.2rem',
                    fontWeight: 'bold',
                    fontFamily: 'var(--font-heading)',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    border: 'var(--brutalist-border)',
                }}>
                    ADD TO THE LIST
                </button>
            </form>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                {tasks.length === 0 ? (
                    <div style={{ textAlign: 'center', opacity: 0.5, fontStyle: 'italic', padding: 'var(--spacing-lg)' }}>
                        SILENCE IS THE ENEMY OF PROGRESS. ADD A TASK.
                    </div>
                ) : (
                    tasks.map(task => (
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
                    ))
                )}
            </div>
        </div>
    );
};
