import { AgentAvatar } from '@/components/ui/agents/AgentAvatar';
import { cn } from '@/lib/utils';
import { Agent } from '@/models/Agent';
import { Loader2 } from 'lucide-react';
import React, { useEffect, useRef } from 'react';
import { Team } from '../../../models/Team';

interface TeamDetailProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  team: Team | null;
  isLoading?: boolean;
  onAgentClick: (agent: Agent) => void;
  className?: string;
  triggerRef?: React.RefObject<HTMLElement>;
}

export const TeamDetail: React.FC<TeamDetailProps> = ({
  open,
  onOpenChange,
  team,
  isLoading = false,
  onAgentClick,
  className,
  triggerRef,
}) => {
  const detailRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = React.useState({ top: 0, left: 0 });

  useEffect(() => {
    if (open && triggerRef?.current) {
      const rect = triggerRef.current.getBoundingClientRect();

      let newTop = rect.bottom + 8;
      let newLeft = rect.left;

      if (newTop + 400 > window.innerHeight) {
        newTop = rect.top - 8 - 400;
      }

      if (newLeft + 385 > window.innerWidth) {
        newLeft = window.innerWidth - 385 - 8;
      }

      setPosition({
        top: newTop,
        left: newLeft,
      });
    } else if (open) {
      setPosition({
        top: window.innerHeight / 2 - 200,
        left: window.innerWidth / 2 - 192,
      });
    }
  }, [open, triggerRef]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        open &&
        detailRef.current &&
        !detailRef.current.contains(event.target as Node) &&
        triggerRef?.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        onOpenChange(false);
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () =>
        document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open, onOpenChange, triggerRef]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && open) {
        onOpenChange(false);
      }
    };

    if (open) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div
      ref={detailRef}
      className={cn(
        'fixed border-0 shadow-2xl rounded-md z-[9999] w-[360px] max-h-[80vh] p-loop-4',
        'bg-neutral-grayscale-90 text-white font-sans overflow-hidden',
        className,
      )}
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
    >
      {isLoading || !team ? (
        <div className="flex items-center justify-center h-[200px]">
          <Loader2 className="w-loop-8 h-loop-8 animate-spin text-brand-accent-50" />
        </div>
      ) : (
        <div className="space-y-loop-3">
          <div className="flex items-start gap-loop-3">
            <AgentAvatar
              agent={{
                id: team.id,
                name: team.name,
                key: team.key,
                color: team.color,
                icon: null,
                expertise: [],
                status: 'active',
                mode: 'team',
              }}
              size="md"
              avatarClassName="font-sans"
              className="flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-text-neutral-inverse-primary truncate">
                {team.name}
              </h3>
              <p className="text-sm text-neutral-grayscale-30 mt-loop-1">
                {team.agents?.length || 0} member
                {team.agents?.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          <hr className="border-neutral-grayscale-70" />

          <div className="space-y-loop-2">
            <p className="text-sm font-semibold text-text-neutral-inverse-primary">
              Team Members
            </p>
            <div className="space-y-loop-2 max-h-[50vh] overflow-y-auto scrollbar-hide pr-loop-1">
              {team.agents?.map((member) => (
                <button
                  key={member.id}
                  onClick={() => onAgentClick(member)}
                  className="w-full flex items-center gap-loop-2 px-loop-3 py-loop-2 rounded-xs bg-neutral-grayscale-80 border border-neutral-grayscale-70 hover:border-brand-accent-50 transition-colors cursor-pointer"
                >
                  <AgentAvatar
                    agent={member}
                    size="sm"
                    className="flex-shrink-0"
                  />
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-sm font-medium text-text-neutral-inverse-primary truncate">
                      {member.name}
                    </p>
                    {member.description && (
                      <p className="text-xs text-neutral-grayscale-30 line-clamp-1">
                        {member.description}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
