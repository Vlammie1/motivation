import { FolderKanban, ClipboardList, LogIn, LogOut, User } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState } from 'react';
import { AuthModal } from './AuthModal';

export const Navigation = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, signOut } = useAuth();
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

    const navItemStyle = (path: string | null) => {
        const isActive = !!path && location.pathname === path;
        return {
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--spacing-xs)',
            padding: 'var(--spacing-xs) var(--spacing-sm)',
            cursor: 'pointer',
            border: '1px solid transparent',
            borderRadius: 'var(--radius-md)',
            background: isActive ? 'var(--color-bg)' : 'transparent',
            color: isActive ? 'var(--color-text)' : 'var(--color-text-muted)',
            fontSize: 'var(--text-sm)',
            fontWeight: 600,
            boxShadow: isActive ? 'var(--shadow-xs)' : 'none',
        };
    };

    return (
        <>
            <nav style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-2xs)',
                marginBottom: 'var(--spacing-xl)',
                padding: 'var(--spacing-2xs)',
                background: 'var(--color-muted)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                flexWrap: 'wrap'
            }}>
                <button
                    onClick={() => navigate('/')}
                    style={navItemStyle('/')}
                >
                    <ClipboardList size={16} />
                    Tracker
                </button>
                <button
                    onClick={() => navigate('/projects')}
                    style={navItemStyle('/projects')}
                >
                    <FolderKanban size={16} />
                    Projecten
                </button>

                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 'var(--spacing-2xs)' }}>
                    {user ? (
                        <>
                            <div style={{ ...navItemStyle(null), cursor: 'default' }}>
                                <User size={16} />
                                <span style={{ fontSize: 'var(--text-xs)' }}>{user.email}</span>
                            </div>
                            <button
                                onClick={signOut}
                                style={navItemStyle(null)}
                            >
                                <LogOut size={16} />
                                Logout
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={() => setIsAuthModalOpen(true)}
                            style={navItemStyle(null)}
                        >
                            <LogIn size={16} />
                            Login / Signup
                        </button>
                    )}
                </div>
            </nav>
            <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
        </>
    );
};
