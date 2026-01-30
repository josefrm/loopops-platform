import { Agent } from '@/models/Agent';
import { Team } from '@/models/Team';
import { getAgentMetadata } from '@/utils/agentMetadata';
import { callBackendApi } from '@/utils/backendApiHelper';
import { useQuery } from '@tanstack/react-query';

export const agentQueryKeys = {
  all: ['agents'] as const,
  detail: (agentId: string) => ['agents', agentId] as const,
  team: (teamId: string) => ['teams', teamId] as const,
};

export const useAgentById = (
  agentId: string | null | undefined,
  enabled: boolean = true,
) => {
  return useQuery<Agent | null>({
    queryKey: agentQueryKeys.detail(agentId || 'none'),
    queryFn: async () => {
      if (!agentId) {
        throw new Error('Agent ID is required');
      }

      const response = await callBackendApi<any>(`/api/v1/agents/${agentId}`, 'GET');

      const toolNames = response.tools?.tools?.map((t: any) => t.name) || [];

      const metadata = getAgentMetadata(response.name);

      return {
        id: response.id,
        name: response.name,
        key: metadata.key,
        color: metadata.color,
        icon: null,
        expertise: toolNames.slice(0, 3),
        description:
          response.system_message?.instructions?.[0]?.substring(0, 200) ||
          metadata.description,
        status: 'active',
        mode: 'single',
        role: response.name,
        prompt: response.system_message?.instructions?.[0] || '',
        model: response.model?.model || '',
        tools: response.tools?.tools || [],
        workspace_id: response.metadata?.workspace_id,
      } as Agent;
    },
    enabled: !!agentId && enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: false,
  });
};

export const useTeamById = (
  teamId: string | null | undefined,
  enabled: boolean = true,
) => {
  return useQuery<Team | null>({
    queryKey: agentQueryKeys.team(teamId || 'none'),
    queryFn: async () => {
      if (!teamId) {
        throw new Error('Team ID is required');
      }

      const response = await callBackendApi<any>(`/api/v1/teams/${teamId}`, 'GET');

      const agents: Agent[] =
        response.members?.map((member: any) => {
          const memberMetadata = getAgentMetadata(member.name);
          const memberTools =
            member.tools?.tools?.map((t: any) => t.name) || [];

          return {
            id: member.id,
            name: member.name,
            key: memberMetadata.key,
            color: memberMetadata.color,
            icon: null,
            expertise: memberTools.slice(0, 3),
            description:
              member.system_message?.instructions?.[0]?.substring(0, 200) ||
              memberMetadata.description,
            status: 'active',
            mode: 'single',
            role: member.name,
            prompt: member.system_message?.instructions?.[0] || '',
            model: member.model?.model || '',
            tools: member.tools?.tools || [],
          } as Agent;
        }) || [];

      const metadata = getAgentMetadata(response.name);

      return {
        id: response.id,
        name: response.name,
        key: metadata.key,
        color: metadata.color,
        prompt: response.system_message?.instructions?.[0] || '',
        model: response.model?.model || '',
        agents,
        type: 'team',
      } as Team;
    },
    enabled: !!teamId && enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: false,
  });
};

export const useAgentsByWorkspace = (
  workspaceId: string | null | undefined,
) => {
  return useQuery<Agent[]>({
    queryKey: ['agents', 'workspace', workspaceId || 'none'] as const,
    queryFn: async () => {
      if (!workspaceId) {
        return [];
      }

      const response = await callBackendApi<any[]>(
        `/api/v1/agents?workspace_id=${workspaceId}`,
        'GET',
      );

      if (!Array.isArray(response)) {
        return [];
      }

      return response.map((agent: any) => {
        const metadata = getAgentMetadata(agent.name);
        const toolNames = agent.tools?.tools?.map((t: any) => t.name) || [];
        const description =
          agent.system_message?.instructions?.[0]?.substring(0, 200) ||
          metadata.description ||
          'No description available';

        return {
          id: agent.id,
          name: agent.name,
          key: metadata.key,
          color: metadata.color,
          icon: null,
          expertise: toolNames.slice(0, 3),
          description,
          status: 'active',
          mode: 'single',
          role: agent.name,
          prompt: agent.system_message?.instructions?.[0] || '',
          model: agent.model?.model || '',
          tools: agent.tools?.tools || [],
          workspace_id: agent.metadata?.workspace_id,
        } as Agent;
      });
    },
    enabled: !!workspaceId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: false,
  });
};
