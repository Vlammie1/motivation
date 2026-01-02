import React, { useState } from 'react';
import { TaskItem } from './TaskItem';

interface Task {
    id: string;
    text: string;
    why: string;
    completed: boolean;
}

interface TaskListProps {
    tasks: Task[];
    setTasks: (tasks: Task[]) => void;
}

export const TaskList: React.FC<TaskListProps> = ({ tasks, setTasks }) => {
    const [newTaskText, setNewTaskText] = useState('');
    const [newTaskWhy, setNewTaskWhy] = useState('');

    const addTask = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTaskText.trim()) return;

        const newTask: Task = {
            id: crypto.randomUUID(),
            text: newTaskText,
            why: newTaskWhy,
            completed: false,
        };

        setTasks([...tasks, newTask]);
        setNewTaskText('');
        setNewTaskWhy('');
    };

    const toggleTask = (id: string) => {
        setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
    };

    const deleteTask = (id: string) => {
        setTasks(tasks.filter(t => t.id !== id));
    };

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

            <form onSubmit={addTask} style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--spacing-sm)',
                marginBottom: 'var(--spacing-lg)',
                border: 'var(--brutalist-border)',
                padding: 'var(--spacing-sm)', // Reduced padding
                background: 'var(--color-secondary)',
                boxShadow: 'none' // Removed shadow to prevent overlap messiness
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
                        boxShadow: 'none',
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
                        boxShadow: 'none',
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
                    boxShadow: 'none'
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
                            task={task}
                            onToggle={toggleTask}
                            onDelete={deleteTask}
                        />
                    ))
                )}
            </div>
        </div>
    );
};
