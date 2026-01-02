import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export const useSupabaseProfile = () => {
    const { user, profile, refreshProfile } = useAuth();

    const updateMainGoal = async (goal: string) => {
        if (!user) return;
        const { error } = await supabase
            .from('profiles')
            .update({ lock_in_beat: goal })
            .eq('id', user.id);

        if (error) {
            console.error('Error updating main goal:', error);
        } else {
            await refreshProfile();
        }
    };

    return { profile, updateMainGoal };
};
