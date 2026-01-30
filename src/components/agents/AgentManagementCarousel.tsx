import { useAgentsByWorkspace } from '@/hooks/useAgentQuery';
import { GradientType } from '@/hooks/useDialogCustomization';
import { useWorkspaceProjectStore } from '@/stores/workspaceProjectStore';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { AgentManagementItem } from './AgentManagementItem';

interface AgentManagementCarouselProps {
  selectedAgent?: any;
  changeBackgroundGradient?: (
    type: GradientType,
    customStyle?: React.CSSProperties,
  ) => void;
  editMode?: boolean;
}

export const AgentManagementCarousel: React.FC<
  AgentManagementCarouselProps
> = ({ selectedAgent, editMode = false }) => {
  const currentWorkspace = useWorkspaceProjectStore((state) =>
    state.getCurrentWorkspace(),
  );
  const [currentIndex, setCurrentIndex] = useState(0);

  const { data: agents = [], isLoading: agentsLoading } = useAgentsByWorkspace(
    currentWorkspace?.id,
  );

  useEffect(() => {
    if (agents.length > 0 && currentIndex >= agents.length) {
      setCurrentIndex(0);
    }
  }, [agents.length, currentIndex]);

  useEffect(() => {
    if (selectedAgent && agents.length > 0) {
      const agentIndex = agents.findIndex(
        (agent) =>
          agent.id === selectedAgent.id || agent.name === selectedAgent.name,
      );

      if (agentIndex !== -1) {
        setCurrentIndex(agentIndex);
      }
    }
  }, [selectedAgent, agents]);

  const goToPrevious = useMemo(
    () => () => {
      setCurrentIndex((prevIndex) =>
        prevIndex === 0 ? agents.length - 1 : prevIndex - 1,
      );
    },
    [agents.length],
  );

  const goToNext = useMemo(
    () => () => {
      setCurrentIndex((prevIndex) =>
        prevIndex === agents.length - 1 ? 0 : prevIndex + 1,
      );
    },
    [agents.length],
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        goToPrevious();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        goToNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToPrevious, goToNext]);

  if (agentsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500 text-lg">Loading agents...</p>
      </div>
    );
  }

  if (!agents || agents.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500 text-lg">No agents available</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[75rem] mx-auto">
      <div className="relative">
        <button
          onClick={goToPrevious}
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-12 z-10 p-2 hover:bg-white/10 transition-all duration-200"
          disabled={agents.length <= 1}
        >
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>

        <button
          onClick={goToNext}
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-12 z-10 p-2 hover:bg-white/10 transition-all duration-200"
          disabled={agents.length <= 1}
        >
          <ChevronRight className="w-5 h-5 text-white" />
        </button>

        <div className="overflow-hidden">
          <div
            className="flex transition-transform duration-300 ease-in-out"
            style={{ transform: `translateX(-${currentIndex * 100}%)` }}
          >
            {agents.map((agent, index) => (
              <div key={agent.id} className="w-full flex-shrink-0">
                <AgentManagementItem
                  agent={{
                    ...agent,
                    description:
                      agent.description || 'No description available',
                  }}
                  isActive={index === currentIndex}
                  initialSection={editMode ? 'configure-prompt' : 'overview'}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
