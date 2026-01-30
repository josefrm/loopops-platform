import { Agent } from '@/models/Agent';
import { Team } from '@/models/Team';

export const transformTeamDetails = (
  teamDetails: {
    team: {
      id: string;
      agent_name: string;
      key: string;
      agent_id: string;
      color: string;
      agent_prompt: string;
      model: string;
      members: string[];
      type?: 'agent' | 'team';
    };
    members: Array<{
      id: string;
      agent_name: string;
      key: string;
      agent_id: string;
      color: string;
      agent_role: string;
      model: string;
      agent_prompt: string;
      workspace_id: string | null;
    }>;
  } | null,
): Team | null => {
  if (!teamDetails) {
    return null;
  }

  const result = {
    id: teamDetails.team.id,
    name: teamDetails.team.agent_name,
    key: teamDetails.team.key || teamDetails.team.agent_id,
    color: teamDetails.team.color || '#6366f1',
    prompt: teamDetails.team.agent_prompt || '',
    model: teamDetails.team.model,
    type: teamDetails.team.type,
    agents: teamDetails.members.map(
      (member): Agent => ({
        id: member.id,
        name: member.agent_name,
        key: member.key || member.agent_id,
        icon: 'Bot' as const,
        color: member.color || '#6366f1',
        expertise: [],
        description: member.agent_role || '',
        status: 'active' as const,
        mode: 'single',
        role: member.agent_role,
        prompt: member.agent_prompt,
        model: member.model,
        isCustom: member.workspace_id !== null,
      }),
    ),
  };

  return result;
};
