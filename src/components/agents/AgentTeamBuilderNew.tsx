import React, { useState } from 'react';
import { Agent } from '@/models/Agent';
import { TeamAgentManager } from './TeamAgentManager';
import { UpdateAgentPrompt } from './UpdateAgentPrompt';

type ViewMode = 'team-builder' | 'edit-agent';

export const AgentTeamBuilder: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewMode>('team-builder');
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  const handleEditAgent = (agent: Agent) => {
    setSelectedAgent(agent);
    setCurrentView('edit-agent');
  };

  const handleBackToTeamBuilder = () => {
    setCurrentView('team-builder');
    setSelectedAgent(null);
  };

  const handleSaveAgentPrompt = async (
    agentId: string,
    updatedPrompt: string,
  ) => {
    // TODO: Implement edge function to update agent prompt
    console.log('Saving agent prompt:', agentId, updatedPrompt);
    // After saving, you might want to stay in edit mode or go back
    // For now, let's stay in edit mode until user clicks back
  };

  return (
    <div className="px-[120px] py-[60px] overflow-hidden">
      {currentView === 'team-builder' && (
        <TeamAgentManager onEditAgent={handleEditAgent} />
      )}

      {currentView === 'edit-agent' && selectedAgent && (
        <UpdateAgentPrompt
          agent={selectedAgent}
          onBack={handleBackToTeamBuilder}
          onSave={handleSaveAgentPrompt}
        />
      )}
    </div>
  );
};
