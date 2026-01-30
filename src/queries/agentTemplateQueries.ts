import { useQuery } from '@tanstack/react-query';
import { AgentTemplateRepository } from '@/repositories/AgentTemplateRepository';

export const agentTemplateKeys = {
  all: ['agent-templates'] as const,
  byIds: (agentIds: string[]) =>
    [...agentTemplateKeys.all, 'by-ids', agentIds.sort().join(',')] as const,
  byId: (agentId: string) =>
    [...agentTemplateKeys.all, 'by-id', agentId] as const,
};

export const useAgentTemplatesByIds = (agentIds: string[]) => {
  return useQuery({
    queryKey: agentTemplateKeys.byIds(agentIds),
    queryFn: async () => {
      if (!agentIds || agentIds.length === 0) return [];
      return AgentTemplateRepository.getAgentsByIds(agentIds);
    },
    enabled: agentIds.length > 0,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

export const useAgentTemplateById = (agentId: string | null) => {
  return useQuery({
    queryKey: agentTemplateKeys.byId(agentId || ''),
    queryFn: async () => {
      if (!agentId) return null;
      return AgentTemplateRepository.getAgentById(agentId);
    },
    enabled: !!agentId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};
