import { AgentAvatar } from '@/components/ui/agents/AgentAvatar';
import { useDialogControl } from '@/contexts/DialogControlContext';
import { cn } from '@/lib/utils';
import { Agent } from '@/models/Agent';
import { EyeIcon, Loader2 } from 'lucide-react';
import React, { useEffect, useLayoutEffect, useRef } from 'react';
import { AgentTeamManagement } from '../../agents/AgentTeamManagement';
import { ActionableText } from '../ActionableText';

interface AgentDetailProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agent: Partial<Agent> | null;
  isLoading?: boolean;
  onViewDetails?: (agent: Partial<Agent>) => void;
  onBack?: () => void;
  className?: string;
  triggerRef?: React.RefObject<HTMLElement>;
}

export const AgentDetail: React.FC<AgentDetailProps> = ({
  open,
  onOpenChange,
  agent,
  isLoading = false,
  onViewDetails,
  onBack,
  className,
  triggerRef,
}) => {
  const detailRef = useRef<HTMLDivElement>(null);
  const { openDialogWithChildren } = useDialogControl();
  const [position, setPosition] = React.useState<{
    top: number;
    left: number;
  } | null>(null);

  useLayoutEffect(() => {
    if (open && triggerRef?.current) {
      const rect = triggerRef.current.getBoundingClientRect();

      // Default position for regular agents (below the avatar)
      let newTop = rect.bottom + 8; // 8px gap below button
      let newLeft = rect.left; // Align with left edge of trigger button

      // If the popup would go off the bottom of the screen, position it above the avatar
      if (newTop + 400 > window.innerHeight) {
        // Assuming 400px max height for popup
        newTop = rect.top - 8 - 400; // Position above with 8px gap
      }

      // If the popup would go off the right of the screen, align it with the right edge
      if (newLeft + 385 > window.innerWidth) {
        // 385px is width of popup
        newLeft = window.innerWidth - 385 - 8; // 8px margin from edge
      }

      setPosition({
        top: newTop,
        left: newLeft,
      });
    } else if (open) {
      // Center on screen if no trigger ref
      setPosition({
        top: window.innerHeight / 2 - 200,
        left: window.innerWidth / 2 - 192,
      });
    }
  }, [open, triggerRef]);

  // Handle clicks outside the detail panel
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

  // Handle escape key
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

  const handleViewDetails = () => {
    if (agent) {
      onViewDetails?.(agent);
    }
    openDialogWithChildren(
      <AgentTeamManagement selectedAgent={agent} initialView="carousel-view" />,
    );
  };

  if (!open) return null;

  return (
    <div
      ref={detailRef}
      className={cn(
        'fixed border-0 shadow-2xl rounded-md z-[9999] w-[360px] max-h-[80vh] p-loop-4',
        'bg-neutral-grayscale-90 text-white font-sans overflow-hidden',
        !position && 'invisible',
        className,
      )}
      style={{
        top: `${position?.top ?? 0}px`,
        left: `${position?.left ?? 0}px`,
      }}
    >
      {isLoading || !agent ? (
        <div className="flex items-center justify-center h-[200px]">
          <Loader2 className="w-loop-8 h-loop-8 animate-spin text-brand-accent-50" />
        </div>
      ) : (
        <div className="space-y-loop-3 overflow-y-auto scrollbar-hide max-h-[calc(80vh-2rem)]">
          <div className="flex items-start gap-loop-3">
            {onBack && (
              <button
                onClick={onBack}
                className="flex-shrink-0 w-loop-8 h-loop-8 rounded-xs bg-neutral-grayscale-80 border border-neutral-grayscale-70 hover:border-brand-accent-50 transition-colors flex items-center justify-center"
                aria-label="Back to team"
              >
                <svg
                  className="w-loop-4 h-loop-4 text-neutral-grayscale-20"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
            )}
            <AgentAvatar
              agent={agent}
              size="md"
              avatarClassName="font-sans"
              className="flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-text-neutral-inverse-primary truncate">
                {agent.name}
              </h3>
              {agent.description && (
                <p className="text-sm text-neutral-grayscale-30 mt-loop-1 line-clamp-2">
                  {agent.description}
                </p>
              )}
            </div>
          </div>

          <hr className="border-neutral-grayscale-70" />

          {agent.expertise && agent.expertise.length > 0 && (
            <div className="space-y-loop-2">
              <p className="text-sm font-semibold text-text-neutral-inverse-primary">
                Capabilities
              </p>
              <div className="space-y-loop-2">
                {agent.expertise.slice(0, 3).map((expertise, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-loop-2 px-loop-3 py-loop-2 rounded-xs bg-neutral-grayscale-80 border border-neutral-grayscale-70"
                  >
                    <div className="w-1 h-1 rounded-full bg-brand-accent-50 mt-1.5 flex-shrink-0" />
                    <span className="text-sm text-neutral-grayscale-20 line-clamp-2 flex-1">
                      {expertise}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <hr className="border-neutral-grayscale-70" />

          <div className="flex items-center justify-end">
            <ActionableText
              ref={null}
              text="DETAILS"
              icon={EyeIcon}
              onClick={handleViewDetails}
              textClassName="text-sm"
              iconClassName="w-loop-5 h-loop-5"
            />
          </div>
        </div>
      )}
    </div>
  );
};
