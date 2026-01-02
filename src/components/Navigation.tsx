import { Home, ClipboardList } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

export const Navigation = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const navItemStyle = (path: string) => ({
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--spacing-sm)',
        padding: 'var(--spacing-sm) var(--spacing-md)',
        cursor: 'pointer',
        border: 'var(--brutalist-border)',
        background: location.pathname === path ? 'var(--color-primary)' : 'var(--color-bg)',
        color: location.pathname === path ? 'white' : 'var(--color-text)',
        fontFamily: 'var(--font-heading)',
        textTransform: 'uppercase' as const,
        fontWeight: 'bold',
        boxShadow: location.pathname === path ? 'none' : '4px 4px 0px var(--color-text)',
        transform: location.pathname === path ? 'translate(2px, 2px)' : 'none',
        transition: 'all 0.1s ease',
    });

    return (
        <nav style={{ display: 'flex', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-lg)' }}>
            <button
                onClick={() => navigate('/')}
                style={navItemStyle('/')}
            >
                <Home size={18} />
                Home
            </button>
            <button
                onClick={() => navigate('/work')}
                style={navItemStyle('/work')}
            >
                <ClipboardList size={18} />
                Work Tracker
            </button>
        </nav>
    );
};
