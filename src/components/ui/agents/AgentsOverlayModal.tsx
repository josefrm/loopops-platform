import React, { useRef } from 'react';
import { Agent } from '@/models/Agent';
import { AgentListItem } from './AgentListItem';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AgentsOverlayModalProps {
  agents: Partial<Agent>[];
  isLoading?: boolean;
  onAgentClick: (agent: Partial<Agent>) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  triggerRef?: React.RefObject<HTMLElement>;
  className?: string;
}

export const AgentsOverlayModal: React.FC<AgentsOverlayModalProps> = ({
  agents,
  isLoading = false,
  onAgentClick,
  open,
  onOpenChange,
  triggerRef,
  className,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = React.useState({ top: 0, left: 0 });

  React.useEffect(() => {
    if (open && triggerRef?.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      
      let newTop = rect.bottom + 8;
      let newLeft = rect.left - 400 + rect.width;

      if (newTop + 600 > window.innerHeight) {
        newTop = rect.top - 8 - 600;
      }

      if (newLeft < 8) {
        newLeft = 8;
      }

      if (newLeft + 400 > window.innerWidth) {
        newLeft = window.innerWidth - 400 - 8;
      }

      setPosition({
        top: newTop,
        left: newLeft,
      });
    }
  }, [open, triggerRef]);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        open &&
        modalRef.current &&
        !modalRef.current.contains(event.target as Node) &&
        triggerRef?.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        onOpenChange(false);
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open, onOpenChange, triggerRef]);

  React.useEffect(() => {
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
      ref={modalRef}
      className={cn(
        'fixed z-[9999] bg-neutral-grayscale-90 rounded-sm shadow-2xl',
        'p-loop-4 gap-loop-4 flex',
        'max-h-[80vh] overflow-hidden',
        className
      )}
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        width: '400px',
      }}
    >
      {isLoading ? (
        <div className="flex items-center justify-center w-full h-[200px]">
          <Loader2 className="w-loop-8 h-loop-8 animate-spin text-brand-accent-50" />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-loop-1 w-full overflow-y-auto scrollbar-hide">
          {agents.map((agent) => (
            <AgentListItem
              key={agent.id}
              agent={agent}
              onClick={(agent) => {
                onAgentClick(agent);
                onOpenChange(false);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};
