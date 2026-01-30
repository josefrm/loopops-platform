import { getBackendApiUrl } from '@/config/api';
import { supabase } from '@/integrations/supabase/client';
import { Team } from '@/models/Team';
import { useQuery } from '@tanstack/react-query';

export const teamsQueryKeys = {
  all: ['teams'] as const,
  detail: (teamId: string) => ['teams', teamId] as const,
};

export const useTeams = () => {
  return useQuery({
    queryKey: teamsQueryKeys.all,
    queryFn: async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('Authentication required');
      }

      const BACKEND_API_URL = getBackendApiUrl();
      const response = await fetch(`${BACKEND_API_URL}/api/v1/teams`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch teams: ${errorText}`);
      }

      const teams: Team[] = await response.json();
      return teams;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 2,
  });
};

export const useTeam = (teamId: string | null) => {
  const { data: teams, ...rest } = useTeams();

  return {
    ...rest,
    data: teams?.find((team) => team.id === teamId),
  };
};
