// Central Agent model/interface for use across the app
export interface Agent {
  id: string;
  name: string;
  key: string;
  color: string;
  icon: any;
  expertise: string[];
  status: string;
  mode: string;
  isCustom?: boolean;
  prompt?: string;
  tools?: any[];

  // New properties
  capabilities?: string[]; // Array of agent capabilities
  description?: string; // Alternative description field
  enabled?: boolean; // Whether the agent is enabled/disabled
  role?: string;
  model?: string;
  members?: any[];
  workspace_id?: string;
}

export const transformToAgent = (agent: any): Agent => {
  return {
    ...agent,
    name: agent.name ?? agent.agent_name,
    icon: agent.icon ?? agent.agent_icon,
    color: agent.color ?? agent.agent_color,
    expertise: agent.expertise ?? agent.agent_expertise,
    description: agent.description ?? agent.agent_description,
    status: agent.status ?? agent.agent_status,
    mode: agent.mode ?? agent.agent_mode,
    prompt: agent.prompt ?? agent.agent_prompt,
  };
};

export const transformAgents = (agents: any[]) => {
  return agents.map((agent) => transformToAgent(agent));
};
