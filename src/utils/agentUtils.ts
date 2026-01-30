import { agentColors } from './colors';

/**
 * Get the color and code name for an agent by name or index
 */
export const getAgentColorOrDefault = (agent: any) => {
  const colors = Object.values(agentColors);
  return agent.color ?? colors[Math.floor(Math.random() * colors.length)];
};
