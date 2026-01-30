import { Agent } from '@/models/Agent';
import { Team } from '@/models/Team';

/**
 * Calculates whether agents in a team can be disabled based on team size
 * @param team - The team object
 * @returns boolean - true if agents can be disabled (more than 1 agent), false otherwise
 */
export const calculateTeamAllowDisable = (team: Team): boolean => {
  if (!team.agents || team.agents.length === 0) {
    console.log('calculateTeamAllowDisable: No agents, cannot disable');
    return false; // No agents, cannot disable
  }

  const allowDisable = team.agents.length > 1;
  console.log(
    'calculateTeamAllowDisable: agents count:',
    team.agents.length,
    'allowDisable:',
    allowDisable,
  );
  return allowDisable; // Allow disable only if more than 1 agent
};

/**
 * Enhances a team object with the allowDisable property
 * @param team - The team object to enhance
 * @returns Team with allowDisable property calculated
 */
export const enhanceTeamWithAllowDisable = (team: Team): Team => {
  return {
    ...team,
    allowDisable: calculateTeamAllowDisable(team),
  };
};

/**
 * Enhances multiple teams with the allowDisable property
 * @param teams - Array of team objects to enhance
 * @returns Array of teams with allowDisable property calculated
 */
export const enhanceTeamsWithAllowDisable = (teams: Team[]): Team[] => {
  return teams.map(enhanceTeamWithAllowDisable);
};

/**
 * Checks if a specific agent can be disabled within their team context
 * @param agent - The agent to check (can be full Agent or simplified agent from Team)
 * @param team - The team the agent belongs to
 * @returns boolean - true if the agent can be disabled, false otherwise
 */
export const canDisableAgent = (agent: Partial<Agent>, team: Team): boolean => {
  // If team doesn't allow disable, agent cannot be disabled
  const allowDisable = team.allowDisable ?? calculateTeamAllowDisable(team);

  if (!allowDisable) {
    return false;
  }

  // Additional logic can be added here (e.g., check if agent is critical, etc.)
  return true;
};
