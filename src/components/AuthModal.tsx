import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { X, Loader2 } from 'lucide-react';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const AuthModal = ({ isOpen, onClose }: AuthModalProps) => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (isLogin) {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
            } else {
                const { error, data } = await supabase.auth.signUp({
                    email,
                    password,
                });
                if (error) throw error;

                // After signup, create a profile row if it doesn't exist (Supabase trigger usually handles this, but let's be safe)
                if (data.user) {
                    const { error: profileError } = await supabase
                        .from('profiles')
                        .upsert({
                            id: data.user.id,
                            email: data.user.email,
                            created_at: new Date().toISOString()
                        });
                    if (profileError) console.error('Profile creation error:', profileError);
                }
            }
            onClose();
        } catch (err: any) {
            setError(err.message || 'An error occurred during authentication');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div
                className="modal-panel"
                style={{ maxWidth: '420px' }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="modal-header">
                    <h2 style={{ fontSize: 'var(--text-xl)' }}>
                        {isLogin ? 'Join the Grind' : 'Start the Legacy'}
                    </h2>
                    <button className="modal-close" onClick={onClose} aria-label="Sluiten">
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                    <div>
                        <label className="label" htmlFor="auth-email">Email</label>
                        <input
                            id="auth-email"
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            style={{ width: '100%' }}
                        />
                    </div>

                    <div>
                        <label className="label" htmlFor="auth-password">Wachtwoord</label>
                        <input
                            id="auth-password"
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            style={{ width: '100%' }}
                        />
                    </div>

                    {error && (
                        <div style={{
                            color: '#b91c1c',
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            borderRadius: 'var(--radius-md)',
                            padding: 'var(--spacing-sm)',
                            fontSize: 'var(--text-sm)'
                        }}>
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="btn-primary"
                        disabled={loading}
                        style={{
                            padding: 'var(--spacing-sm)',
                            marginTop: 'var(--spacing-2xs)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 'var(--spacing-xs)'
                        }}
                    >
                        {loading ? <Loader2 className="animate-spin" size={16} /> : null}
                        {isLogin ? 'Inloggen' : 'Account aanmaken'}
                    </button>
                </form>

                <div style={{ marginTop: 'var(--spacing-md)', textAlign: 'center' }}>
                    <button
                        onClick={() => setIsLogin(!isLogin)}
                        style={{
                            background: 'none',
                            border: 'none',
                            boxShadow: 'none',
                            color: 'var(--color-text-muted)',
                            fontSize: 'var(--text-sm)',
                            padding: 'var(--spacing-2xs)'
                        }}
                    >
                        {isLogin ? 'Nog geen account? Meld je aan' : 'Al een account? Log in'}
                    </button>
                </div>
            </div>
        </div>
    );
};
