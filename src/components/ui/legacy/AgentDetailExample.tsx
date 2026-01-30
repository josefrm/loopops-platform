import React, { useRef, useState } from 'react';
import { AgentDetail } from '@/components/ui/AgentDetail';
import { Agent } from '@/models/Agent';

// Example usage component
export const AgentDetailExample: React.FC = () => {
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Example agent data
  const exampleAgent: Agent = {
    id: '1',
    agent_name: 'UI Designer',
    key: 'UID',
    color: '#3B82F6',
    agent_color: '#3B82F6',
    agent_icon: '🎨',
    agent_expertise: ['UI Design', 'Prototyping', 'User Research', 'Figma'],
    agent_description:
      'Specialized in creating intuitive user interfaces and conducting user research to improve product usability.',
    agent_status: 'active',
    agent_mode: 'specialist',
  };

  const handleViewDetails = (agent: Agent) => {
    console.log('View details for:', agent.agent_name);
    // Navigate to detail view or open modal
    setIsDetailOpen(false);
  };

  const handleToggleAgent = (agent: Agent, enabled: boolean) => {
    console.log(
      `Agent ${agent.agent_name} ${enabled ? 'enabled' : 'disabled'}`,
    );
    // Update agent status in your backend/state
  };

  return (
    <div className="p-4">
      <button
        ref={triggerRef}
        onClick={() => setIsDetailOpen(!isDetailOpen)}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        Show Agent Details
      </button>

      <AgentDetail
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        agent={exampleAgent}
        onViewDetails={handleViewDetails}
        onToggleAgent={handleToggleAgent}
        triggerRef={triggerRef}
      />
    </div>
  );
};
