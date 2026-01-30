/* eslint-disable react-hooks/exhaustive-deps  */

import { useDialogCustomization } from '@/hooks/useDialogCustomization';
import React, { useState } from 'react';
import { AgentManagementCarousel } from './AgentManagementCarousel';

export type ViewMode =
  | 'team-builder'
  | 'edit-agent'
  | 'carousel-view'
  | 'create-agent'
  | 'update-team';

interface AgentTeamManagementProps {
  selectedAgent?: any; // Agent from AgentDetail context
  initialView?: ViewMode; // Allow setting initial view
}

export const AgentTeamManagement: React.FC<AgentTeamManagementProps> = ({
  selectedAgent: externalSelectedAgent,
  initialView = 'team-builder', // Default to team-builder if not specified
}) => {
  // Hook to control dialog appearance
  const {
    setTitle,
    setGradient,
    resetBackground,
    setTitleStyle,
    setCloseStyle,
    setHeaderBackground,
  } = useDialogCustomization();

  // Start with the provided initial view or team-builder by default
  const [currentView, setCurrentView] = useState<ViewMode>(initialView);

  const [editMode, setEditMode] = useState(false); // Track if we're in edit mode

  // When an external agent is provided, switch to carousel view and show that agent
  React.useEffect(() => {
    if (externalSelectedAgent) {
      console.log(
        'Switching to carousel view for external agent:',
        externalSelectedAgent,
      );
      setEditMode(false); // External agents start in overview mode
      // Use initialView if provided and it makes sense with an external agent, otherwise default to carousel-view
      const targetView =
        initialView === 'carousel-view' || initialView === 'edit-agent'
          ? initialView
          : 'carousel-view';
      setCurrentView(targetView);
    } else {
      console.log('No external agent and not ignoring, ensuring proper view');
      // Only switch back to initial view if we're currently in carousel view
      if (currentView === 'carousel-view') {
        console.log(
          'Switching from carousel back to initial view:',
          initialView,
        );
        setCurrentView(initialView);
      }
    }
  }, [externalSelectedAgent, currentView, initialView]);

  // Effect to update dialog appearance based on current view
  React.useEffect(() => {
    switch (currentView) {
      case 'team-builder': {
        setTitle('Teams Configuration');
        setGradient('all-agents'); // Default all-agents gradient
        setHeaderBackground({
          background: '#000000',
        });
        break;
      }
      case 'edit-agent':
        setTitle('Edit Agent');
        setGradient('black'); // Brand gradient for editing
        setHeaderBackground({
          background: '#000000',
        });
        break;
      case 'update-team': {
        setTitle('Team Configuration');
        setGradient('all-agents'); // Default all-agents gradient
        setHeaderBackground({
          background: '#000000',
        });
        break;
      }
      case 'carousel-view':
        setTitle('Agent Overview');
        setGradient('black'); // Agent gradient for carousel
        setHeaderBackground({
          background: '#000000',
        });
        break;
      case 'create-agent':
        setTitle('Create New Agent');
        setGradient('black'); // Initial gradient for creation - can be overridden by child components
        setHeaderBackground({
          background: '#000000',
        });
        break;
      default:
        setTitle('Teams Configuration');
        resetBackground();
    }
    setTitleStyle({ color: '#FFFFFF' });
    setCloseStyle({ color: '#FFFFFF' });
  }, [currentView]); // Only run when currentView changes, not when setGradient is called

  return (
    <div className="h-full flex items-center justify-center overflow-hidden">
      <div className="w-full max-w-none">
        {currentView === 'carousel-view' && (
          <>
            <AgentManagementCarousel
              selectedAgent={externalSelectedAgent}
              changeBackgroundGradient={setGradient}
              editMode={editMode}
            />
          </>
        )}
      </div>
    </div>
  );
};
