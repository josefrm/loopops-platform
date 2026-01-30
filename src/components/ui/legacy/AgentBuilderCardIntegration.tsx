// Example of how to integrate AgentDetail into AgentBuilderCard

import React, { useRef, useState } from 'react';
import { AgentDetail } from '@/components/ui/AgentDetail';
import { Agent } from '@/models/Agent';

// This would be added to your AgentBuilderCard component

const AgentBuilderCardWithDetail: React.FC<{ agent: Agent }> = ({ agent }) => {
  const [showAgentDetail, setShowAgentDetail] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleViewDetails = (agent: Agent) => {
    console.log('Opening detailed view for:', agent.agent_name);
    // Navigate to agent details page or open detailed modal
    setShowAgentDetail(false);
  };

  const handleToggleAgent = (agent: Agent, enabled: boolean) => {
    console.log(
      `${enabled ? 'Enabling' : 'Disabling'} agent:`,
      agent.agent_name,
    );
    // Call your API to update agent status
    // Example:
    // updateAgentStatus(agent.id, enabled ? 'active' : 'inactive');
  };

  return (
    <>
      {/* Your existing AgentBuilderCard JSX */}
      <div
        ref={cardRef}
        className="p-4 border rounded-lg cursor-pointer hover:bg-gray-50"
        onClick={() => setShowAgentDetail(!showAgentDetail)}
      >
        <div className="flex items-center space-x-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
            style={{ backgroundColor: agent.color || agent.agent_color }}
          >
            {agent.key || agent.agent_name.charAt(0)}
          </div>
          <div>
            <h3 className="font-medium">{agent.agent_name}</h3>
            <p className="text-sm text-gray-500">@{agent.key}</p>
          </div>
        </div>
      </div>

      {/* AgentDetail component */}
      <AgentDetail
        open={showAgentDetail}
        onOpenChange={setShowAgentDetail}
        agent={agent}
        onViewDetails={handleViewDetails}
        onToggleAgent={handleToggleAgent}
        triggerRef={cardRef}
      />
    </>
  );
};

export default AgentBuilderCardWithDetail;
