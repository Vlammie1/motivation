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
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 'var(--spacing-md)'
        }}>
            <div style={{
                background: 'var(--color-bg)',
                border: 'var(--brutalist-border)',
                boxShadow: '8px 8px 0px var(--color-text)',
                padding: 'var(--spacing-xl)',
                maxWidth: '450px',
                width: '100%',
                position: 'relative'
            }}>
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: 'var(--spacing-md)',
                        right: 'var(--spacing-md)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer'
                    }}
                >
                    <X size={24} />
                </button>

                <h2 style={{
                    textTransform: 'uppercase',
                    fontSize: '2rem',
                    marginBottom: 'var(--spacing-lg)',
                    borderBottom: '4px solid var(--color-primary)',
                    display: 'inline-block'
                }}>
                    {isLogin ? 'Join the Grind' : 'Start the Legacy'}
                </h2>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                    <div>
                        <label style={{ display: 'block', textTransform: 'uppercase', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '4px' }}>
                            Email
                        </label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            style={{
                                width: '100%',
                                padding: 'var(--spacing-sm)',
                                border: 'var(--brutalist-border)',
                                fontFamily: 'var(--font-heading)',
                                fontSize: '1.1rem',
                                outline: 'none'
                            }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', textTransform: 'uppercase', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '4px' }}>
                            Password
                        </label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            style={{
                                width: '100%',
                                padding: 'var(--spacing-sm)',
                                border: 'var(--brutalist-border)',
                                fontFamily: 'var(--font-heading)',
                                fontSize: '1.1rem',
                                outline: 'none'
                            }}
                        />
                    </div>

                    {error && (
                        <div style={{
                            color: 'white',
                            background: '#ef4444',
                            padding: 'var(--spacing-sm)',
                            fontWeight: 'bold',
                            border: '2px solid black'
                        }}>
                            ERROR: {error.toUpperCase()}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            background: 'var(--color-primary)',
                            color: 'white',
                            padding: 'var(--spacing-md)',
                            fontSize: '1.2rem',
                            fontWeight: 'bold',
                            fontFamily: 'var(--font-heading)',
                            textTransform: 'uppercase' as const,
                            border: 'var(--brutalist-border)',
                            cursor: 'pointer',
                            boxShadow: '4px 4px 0px var(--color-text)',
                            marginTop: 'var(--spacing-sm)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 'var(--spacing-sm)'
                        }}
                    >
                        {loading ? <Loader2 className="animate-spin" /> : null}
                        {isLogin ? 'Login Now' : 'Create Account'}
                    </button>
                </form>

                <div style={{ marginTop: 'var(--spacing-lg)', textAlign: 'center' }}>
                    <button
                        onClick={() => setIsLogin(!isLogin)}
                        style={{
                            background: 'none',
                            border: 'none',
                            textDecoration: 'underline',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            textTransform: 'uppercase' as const,
                            fontSize: '0.8rem'
                        }}
                    >
                        {isLogin ? 'Don\'t have an account? Sign up' : 'Already have an account? Login'}
                    </button>
                </div>
            </div>
        </div>
    );
};
