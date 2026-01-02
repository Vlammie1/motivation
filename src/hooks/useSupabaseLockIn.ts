import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export const useSupabaseLockIn = () => {
    const { user } = useAuth();

    const startSession = async () => {
        if (!user) return null;
        const { data, error } = await supabase
            .from('lock_in_sessions')
            .insert({
                user_id: user.id,
                started_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) {
            console.error('Error starting lock-in session:', error);
            return null;
        }
        return data;
    };

    const endSession = async (sessionId: string, idleSeconds: number) => {
        const { error } = await supabase
            .from('lock_in_sessions')
            .update({
                ended_at: new Date().toISOString(),
                idle_seconds: idleSeconds
            })
            .eq('id', sessionId);

        if (error) {
            console.error('Error ending lock-in session:', error);
        }
    };

    return { startSession, endSession };
};
