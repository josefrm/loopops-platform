import { supabase } from '@/integrations/supabase/client';

export interface AgentTemplateBasic {
  id: string;
  role_name: string;
  type: 'agent' | 'team';
}

export class AgentTemplateRepository {
  /**
   * Get multiple agent templates by their IDs
   */
  static async getAgentsByIds(agentIds: string[]): Promise<AgentTemplateBasic[]> {
    if (!agentIds || agentIds.length === 0) {
      return [];
    }

    const { data: agents, error } = await supabase
      .from('loopops_global_agent_templates')
      .select('id, role_name, type')
      .in('id', agentIds);

    if (error) {
      console.error('Error fetching agents by IDs:', error);
      return [];
    }

    return (agents || []).map(agent => ({
      ...agent,
      type: agent.type as 'agent' | 'team',
    }));
  }

  /**
   * Get a single agent template by ID
   */
  static async getAgentById(agentId: string): Promise<AgentTemplateBasic | null> {
    const { data: agent, error } = await supabase
      .from('loopops_global_agent_templates')
      .select('id, role_name, type')
      .eq('id', agentId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching agent by ID:', error);
      return null;
    }

    if (!agent) {
      return null;
    }

    return {
      ...agent,
      type: agent.type as 'agent' | 'team',
    };
  }
}
