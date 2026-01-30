import {
  AgentTeamOption,
  AgentTeamPicker,
} from '@/components/ui/agents/AgentTeamPicker';
import { Button } from '@/components/ui/button';
import { useAgentsByWorkspace } from '@/hooks/useAgentQuery';
import { useCurrentWorkspace } from '@/hooks/useCurrentWorkspace';
import { cn } from '@/lib/utils';
import { Agent } from '@/models/Agent';
import { Plus } from 'lucide-react';
import React from 'react';
import { ClosableBadge } from '../ClosableBadge';
import { AgentAvatar } from './AgentAvatar';

interface AgentPickerProps {
  selectedAgents: Agent[];
  onAgentsChange: (agents: Agent[]) => void;
  className?: string;
  variant?: 'dark' | 'light'; // Add variant prop for dark/light mode
}

export const AgentPicker: React.FC<AgentPickerProps> = ({
  selectedAgents,
  onAgentsChange,
  className = '',
  variant = 'dark', // Default to dark mode
}) => {
  const currentWorkspace = useCurrentWorkspace();
  const { data: workspaceAgents = [] } = useAgentsByWorkspace(
    currentWorkspace?.id,
  );

  // Transform agents to AgentTeamPicker options (agents only)
  const agentOptions: AgentTeamOption[] = workspaceAgents
    .filter(
      (agent) => !selectedAgents.find((selected) => selected.id === agent.id),
    )
    .map((agent) => ({
      id: agent.id,
      type: 'agent' as const,
      agent: agent,
      selected: false,
    }));

  const handleAgentSelect = (option: AgentTeamOption) => {
    if (option.type === 'agent' && option.agent) {
      const selectedAgent = option.agent;
      if (!selectedAgents.find((agent) => agent.id === selectedAgent.id)) {
        onAgentsChange([...selectedAgents, selectedAgent]);
      }
    }
  };

  const handleRemoveAgent = (agentId: string) => {
    const updatedAgents = selectedAgents.filter(
      (agent) => agent.id !== agentId,
    );
    onAgentsChange(updatedAgents);
  };

  return (
    <div className={cn(`space-y-loop-2`, className)}>
      {/* Title, badges and add button in same line */}
      {/* Title */}
      <div className="flex items-center">
        <h4 className={`text-md text-neutral-grayscale-40`}>Agents</h4>
      </div>
      <div className="flex flex-wrap items-center gap-loop-2">
        {/* Agent badges */}
        {selectedAgents.map((agent) => (
          <ClosableBadge
            key={agent.id}
            variant={variant}
            onClose={() => handleRemoveAgent(agent.id)}
          >
            <AgentAvatar
              agent={agent}
              size="sm"
              className="flex"
              avatarClassName="w-5 h-5"
              avatarTextClassName="text-xs"
              keyClassName="hidden"
            />
          </ClosableBadge>
        ))}

        {/* Add agent button */}
        <AgentTeamPicker
          trigger={
            <Button
              size="sm"
              className={`flex items-center rounded-full h-6 w-6 transition-all text-black bg-white hover:bg-brand-accent-50`}
            >
              <Plus className="w-4 h-4" />
            </Button>
          }
          options={agentOptions}
          onSelect={handleAgentSelect}
          maxItemsPerColumn={6}
          align="start"
          variant={variant} // Pass variant to AgentTeamPicker
        />
      </div>
    </div>
  );
};
