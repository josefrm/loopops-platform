export const buildTeamFromTemplate = (
  template: {
    id: string;
    role_name: string;
    system_prompt: string;
    type?: 'agent' | 'team';
    model?: string; // Allow model to be passed in
  },
  workspaceId: string,
) => {
  const teamId = template.id;
  const model = template.model || undefined;
  
  return {
    team: {
      id: teamId,
      agent_name: template.role_name,
      agent_prompt: template.system_prompt,
      agent_role: template.role_name,
      model: model,
      key: teamId.substring(0, 5),
      color: '#6366f1',
      agent_id: teamId,
      members: [template.id],
      type: template.type,
    },
    members: [
      {
        id: teamId,
        agent_name: template.role_name,
        key: teamId.substring(0, 5),
        color: '#6366f1',
        agent_role: template.role_name,
        model: model,
        agent_prompt: template.system_prompt,
        agent_id: teamId,
        workspace_id: workspaceId,
      },
    ],
  };
};
