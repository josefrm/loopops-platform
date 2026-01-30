import { useMemo } from 'react';
import { useAllModelCapabilities } from '@/hooks/useModelCapabilities';
import { useAgentTemplatesByIds } from '@/queries/agentTemplateQueries';
import { Agent } from '@/models/Agent';
import { getAgentMetadata } from '@/utils/agentMetadata';
import { useStageTemplate } from '@/hooks/useStageTemplate';

/**
 * Hook that returns the list of agents associated with the current stage's model
 * by looking up the model's used_by_agents field (which contains agent UUIDs)
 * and fetching the actual agent data from the database using React Query
 */
export const useAgentsFromModel = () => {
  const { stageTemplate, isLoadingStageTemplate } = useStageTemplate();
  const { data: allCapabilities, isLoading: isLoadingCapabilities } = useAllModelCapabilities();

  // Determine agent IDs based on template type
  const agentIds = useMemo(() => {
    if (!stageTemplate) {
      return [];
    }

    // For TEAMS: agents are already in stageTemplate.agents
    if (stageTemplate.type === 'team' && stageTemplate.agents && stageTemplate.agents.length > 0) {
      return stageTemplate.agents.map(agent => agent.id);
    }

    // For AGENT: return only the stage template's own ID (single agent)
    if ( stageTemplate.type === 'agent') {
      return [stageTemplate.id];
    }

    if (!allCapabilities || !stageTemplate?.model) {
      return [];
    }

    const modelCapability = allCapabilities.find(
      (cap) => cap.modelId === stageTemplate.model || cap.modelName === stageTemplate.model
    );

    return modelCapability?.usedByAgents || [];
  }, [allCapabilities, stageTemplate]);

  // Fetch agent templates using React Query
  const { data: agentTemplates = [], isLoading: isLoadingAgents } = useAgentTemplatesByIds(agentIds);

  // Map templates to Agent objects with metadata
  const agents = useMemo<Agent[]>(() => {
    // For teams, map agents from template with proper metadata
    if (stageTemplate?.type === 'team' && stageTemplate.agents && stageTemplate.agents.length > 0) {
      return stageTemplate.agents.map((agent) => {
        const metadata = getAgentMetadata(agent.role || agent.name);
        
        return {
          ...agent,
          name: metadata.displayName,
          key: metadata.key,
          color: agent.color || metadata.color,
          model: stageTemplate.model,
        } as Agent;
      });
    }
    
    // For agent stage, use the stageTemplate itself as the single agent
    if (stageTemplate?.type === 'agent') {
      const metadata = getAgentMetadata(stageTemplate.role || stageTemplate.name);
      return [{
        id: stageTemplate.id,
        name: metadata.displayName,
        key: metadata.key,
        color: metadata.color,
        icon: null,
        expertise: [],
        status: 'active',
        mode: 'single',
        role: stageTemplate.role || stageTemplate.name,
        model: stageTemplate.model,
      } as Agent];
    }

    if (!stageTemplate?.model || agentTemplates.length === 0) {
      return [];
    }

    return agentTemplates.map((template) => {
      const metadata = getAgentMetadata(template.role_name);
      
      return {
        id: template.id,
        name: metadata.displayName,
        key: metadata.key,
        color: metadata.color,
        icon: null,
        expertise: [],
        status: 'active',
        mode: 'single',
        role: template.role_name,
        model: stageTemplate.model,
      } as Agent;
    });
  }, [agentTemplates, stageTemplate]);

  return {
    agents,
    isLoading: isLoadingStageTemplate || isLoadingCapabilities || isLoadingAgents,
    modelId: stageTemplate?.model || null,
  };
};
