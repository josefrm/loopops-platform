import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';

interface UserProfile {
  id: string;
  user_id: string;
  email: string | null;
  name: string | null;
  role: string | null;
  created_at: string;
  updated_at: string;
}

export const useUserProfile = () => {
  const { user, isFullyAuthenticated } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = async () => {
    if (!isFullyAuthenticated || !user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('v2_profile')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          // No profile found, this is okay for new users
          console.log('No profile found for user:', user.id);
          setProfile(null);
          return;
        }
        throw fetchError;
      }

      setProfile(data);
    } catch (err: any) {
      console.error('Error fetching profile:', err);
      setError(err.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isFullyAuthenticated]);

  const refreshProfile = () => {
    fetchProfile();
  };

  return {
    profile,
    loading,
    error,
    refreshProfile,
  };
};
