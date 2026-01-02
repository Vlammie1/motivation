import React from 'react';

interface Task {
    id: string;
    text: string;
    why: string;
    completed: boolean;
}

interface TaskItemProps {
    task: Task;
    onToggle: (id: string) => void;
    onDelete: (id: string) => void;
}

export const TaskItem: React.FC<TaskItemProps> = ({ task, onToggle, onDelete }) => {
    return (
        <div
            style={{
                border: 'var(--brutalist-border)',
                boxShadow: 'var(--brutalist-shadow)',
                marginBottom: 'var(--spacing-md)',
                padding: 'var(--spacing-md)',
                backgroundColor: task.completed ? '#e0e0e0' : 'white',
                opacity: task.completed ? 0.6 : 1,
                transition: 'var(--transition-fast)',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--spacing-sm)'
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
                <button
                    onClick={() => onToggle(task.id)}
                    style={{
                        width: '30px',
                        height: '30px',
                        border: 'var(--brutalist-border)',
                        background: task.completed ? 'var(--color-primary)' : 'white',
                        fontWeight: 'bold',
                        fontSize: '1.2rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white'
                    }}
                >
                    {task.completed ? 'X' : ''}
                </button>
                <span style={{
                    fontSize: '1.2rem',
                    fontWeight: 'bold',
                    textDecoration: task.completed ? 'line-through' : 'none'
                }}>
                    {task.text}
                </span>
            </div>

            {task.why && (
                <div style={{
                    fontSize: '0.9rem',
                    fontStyle: 'italic',
                    borderLeft: '4px solid var(--color-secondary)',
                    paddingLeft: 'var(--spacing-sm)',
                    marginLeft: '46px' // align with text
                }}>
                    FOR: {task.why.toUpperCase()}
                </div>
            )}

            <button
                onClick={() => onDelete(task.id)}
                style={{
                    alignSelf: 'flex-end',
                    fontSize: '0.8rem',
                    textDecoration: 'underline',
                    color: 'var(--color-primary)',
                    fontWeight: 'bold',
                    marginTop: 'var(--spacing-sm)'
                }}
            >
                I'M WEAK SO I'M DELETING THIS
            </button>
        </div>
    );
};
