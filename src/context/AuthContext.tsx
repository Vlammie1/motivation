import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface Profile {
    id: string;
    email: string | undefined;
    lock_in_beat: string | null;
    created_at: string;
}

interface AuthContextType {
    user: User | null;
    session: Session | null;
    profile: Profile | null;
    loading: boolean;
    signOut: () => Promise<void>;
    refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);

    // Separate effect for fetching profile when user changes
    useEffect(() => {
        if (!user) {
            setProfile(null);
            return;
        }

        const fetchProfile = async () => {
            try {
                console.log('Fetching profile for user:', user.id);
                const { data, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .maybeSingle();

                console.log('Profile fetch result:', { data, error });

                if (error) {
                    console.error('Error fetching profile:', error);
                    setProfile(null);
                    return;
                }

                if (!data) {
                    // Profile doesn't exist, create one
                    console.log('Profile not found, creating one...');
                    const newProfileData = {
                        id: user.id,
                        email: user.email,
                        created_at: new Date().toISOString()
                    };

                    const { data: newProfile, error: insertError } = await supabase
                        .from('profiles')
                        .insert(newProfileData)
                        .select()
                        .single();

                    if (insertError) {
                        console.error('Error creating profile:', insertError);
                        setProfile(null);
                    } else if (newProfile) {
                        console.log('Profile created successfully:', newProfile);
                        setProfile(newProfile);
                    }
                } else {
                    console.log('Profile loaded successfully:', data);
                    setProfile(data);
                }
            } catch (err) {
                console.error('Unexpected error in fetchProfile:', err);
                setProfile(null);
            }
        };

        fetchProfile();
    }, [user]);

    // Auth initialization effect
    useEffect(() => {
        let mounted = true;

        const initAuth = async () => {
            try {
                console.log('Initializing auth...');
                const { data: { session }, error } = await supabase.auth.getSession();

                if (error) {
                    console.error('Error getting session:', error);
                }

                if (mounted) {
                    setSession(session);
                    setUser(session?.user ?? null);
                    setLoading(false); // ALWAYS set loading to false here
                }
            } catch (err) {
                console.error('Error in initAuth:', err);
                if (mounted) {
                    setLoading(false);
                }
            }
        };

        initAuth();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            console.log('Auth state changed:', event);

            if (mounted) {
                setSession(session);
                setUser(session?.user ?? null);
            }
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);

    const signOut = async () => {
        await supabase.auth.signOut();
    };

    const refreshProfile = async () => {
        if (!user) return;

        try {
            const { data } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .maybeSingle();

            if (data) {
                setProfile(data);
            }
        } catch (err) {
            console.error('Error refreshing profile:', err);
        }
    };

    return (
        <AuthContext.Provider value={{ user, session, profile, loading, signOut, refreshProfile }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
