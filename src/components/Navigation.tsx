import { Home, ClipboardList, LogIn, LogOut, User } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState } from 'react';
import { AuthModal } from './AuthModal';

export const Navigation = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, signOut } = useAuth();
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

    const navItemStyle = (path: string | null) => ({
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--spacing-sm)',
        padding: 'var(--spacing-sm) var(--spacing-md)',
        cursor: 'pointer',
        border: 'var(--brutalist-border)',
        background: path && location.pathname === path ? 'var(--color-primary)' : 'var(--color-bg)',
        color: path && location.pathname === path ? 'white' : 'var(--color-text)',
        fontFamily: 'var(--font-heading)',
        textTransform: 'uppercase' as const,
        fontWeight: 'bold',
        boxShadow: path && location.pathname === path ? 'none' : '4px 4px 0px var(--color-text)',
        transform: path && location.pathname === path ? 'translate(2px, 2px)' : 'none',
        transition: 'all 0.1s ease',
    });

    return (
        <>
            <nav style={{ display: 'flex', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-lg)', flexWrap: 'wrap' }}>
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

                <div style={{ marginLeft: 'auto', display: 'flex', gap: 'var(--spacing-md)' }}>
                    {user ? (
                        <>
                            <div style={{ ...navItemStyle(null), cursor: 'default', background: 'var(--color-bg)' }}>
                                <User size={18} />
                                <span style={{ fontSize: '0.8rem' }}>{user.email}</span>
                            </div>
                            <button
                                onClick={signOut}
                                style={navItemStyle(null)}
                            >
                                <LogOut size={18} />
                                Logout
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={() => setIsAuthModalOpen(true)}
                            style={navItemStyle(null)}
                        >
                            <LogIn size={18} />
                            Login / Signup
                        </button>
                    )}
                </div>
            </nav>
            <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
        </>
    );
};
