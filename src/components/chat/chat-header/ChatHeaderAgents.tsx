import { AgentDetail } from '@/components/ui/agents/AgentDetail';
import { AgentsOverlayModal } from '@/components/ui/agents/AgentsOverlayModal';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useDialogControl } from '@/contexts/DialogControlContext';
import { useAgentById, useTeamById } from '@/hooks/useAgentQuery';
import { useAgentsFromModel } from '@/hooks/useAgentsFromModel';
import { useStageTemplate } from '@/hooks/useStageTemplate';
import { cn } from '@/lib/utils';
import { Agent } from '@/models/Agent';
import { Loader2 } from 'lucide-react';
import React, { useRef, useState } from 'react';

interface ChatHeaderAgentsProps {
  className?: string;
}

export const ChatHeaderAgents: React.FC<ChatHeaderAgentsProps> = ({
  className = '',
}) => {
  const { agents, isLoading } = useAgentsFromModel();
  const { stageTemplate } = useStageTemplate();
  const { openDialog } = useDialogControl();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [showAgentDetail, setShowAgentDetail] = useState(false);
  const [showOverlayModal, setShowOverlayModal] = useState(false);
  const triggerRefs = useRef<(HTMLDivElement | null)[]>([]);
  const overflowRef = useRef<HTMLDivElement>(null);

  const isTeamStage = stageTemplate?.type === 'team';

  const { data: selectedTeam, isLoading: isLoadingTeam } = useTeamById(
    isTeamStage ? stageTemplate?.id : null,
    !!(isTeamStage && stageTemplate?.id),
  );

  const { data: selectedAgent, isLoading: isLoadingAgent } = useAgentById(
    selectedId,
    !!selectedId,
  );

  const displayAgents = isTeamStage ? selectedTeam?.agents || [] : agents;
  const isLoadingAgents = isTeamStage ? isLoadingTeam : isLoading;

  if (isLoadingAgents) {
    return (
      <div className={cn('flex items-center', className)} data-testid="chat-header-agents-loading">
        <Loader2 className="w-loop-6 h-loop-6 animate-spin text-brand-accent-50" />
      </div>
    );
  }

  if (displayAgents.length === 0) return null;

  const handleAgentClick = (agent: Agent, index: number) => {
    setSelectedId(agent.id);
    setSelectedIndex(index);
    setShowAgentDetail(true);
  };

  const handleOverlayAgentClick = (agent: Partial<Agent>) => {
    if (agent.id) {
      const agentIndex = displayAgents.findIndex((a) => a.id === agent.id);
      setSelectedId(agent.id);
      setSelectedIndex(agentIndex !== -1 ? agentIndex : 0);
      setShowAgentDetail(true);
      setShowOverlayModal(false);
    }
  };

  const handleViewDetails = () => {
    setShowAgentDetail(false);
    openDialog();
  };

  const handleOverflowClick = () => {
    setShowOverlayModal(true);
  };

  const setTriggerRef = (index: number) => (el: HTMLDivElement | null) => {
    triggerRefs.current[index] = el;
  };

  const avatarIconRender = (
    index: number,
    agent: Agent,
    onClick: () => void,
  ) => {
    return (
      <Avatar
        className="w-loop-10 h-loop-10 shadow-sm cursor-pointer hover:scale-105 transition-transform"
        style={{
          marginLeft: index > 0 ? '-12px' : '0',
          zIndex: index,
        }}
        onClick={onClick}
      >
        {agent.icon && (
          <AvatarImage
            src={agent.icon}
            alt={agent.name}
            className="object-cover"
          />
        )}
        <AvatarFallback
          className="text-md font-bold text-white"
          style={{
            backgroundColor: agent.color,
          }}
        >
          {agent.key}
        </AvatarFallback>
      </Avatar>
    );
  };

  const remainingAgentsCountIcon = () => {
    return (
      <div onClick={handleOverflowClick} className="cursor-pointer">
        <Avatar
          className="w-loop-10 h-loop-10 shadow-sm hover:scale-105 transition-transform"
          style={{
            marginLeft: '-12px',
            zIndex: displayAgents.length + 1,
          }}
        >
          <AvatarFallback className="text-md font-bold text-white bg-brand-accent-50">
            {displayAgents.length - 5 >= 10
              ? `${displayAgents.length - 5}+`
              : `+${displayAgents.length - 5}`}
          </AvatarFallback>
        </Avatar>
      </div>
    );
  };

  return (
    <div className={cn('flex items-center relative', className)}>
      {displayAgents.length > 5 ? (
        <>
          {displayAgents.slice(0, 5).map((agent, index) => (
            <div key={agent.id} ref={setTriggerRef(index)}>
              {avatarIconRender(index, agent, () =>
                handleAgentClick(agent, index),
              )}
            </div>
          ))}

          <div ref={overflowRef}>{remainingAgentsCountIcon()}</div>

          <AgentsOverlayModal
            agents={displayAgents.slice(5)}
            isLoading={false}
            onAgentClick={handleOverlayAgentClick}
            open={showOverlayModal}
            onOpenChange={setShowOverlayModal}
            triggerRef={overflowRef}
          />
        </>
      ) : (
        displayAgents.map((agent, index) => (
          <div key={agent.id} ref={setTriggerRef(index)}>
            {avatarIconRender(index, agent, () =>
              handleAgentClick(agent, index),
            )}
          </div>
        ))
      )}

      {/* Agent Detail Modal - works for both agent stage and team members */}
      <AgentDetail
        open={showAgentDetail}
        onOpenChange={(open) => {
          setShowAgentDetail(open);
          if (!open) {
            setSelectedId(null);
            setSelectedIndex(0);
          }
        }}
        agent={selectedAgent}
        isLoading={isLoadingAgent}
        onViewDetails={handleViewDetails}
        triggerRef={{
          current: triggerRefs.current[selectedIndex] || null,
        }}
      />
    </div>
  );
};
