import React from 'react';
import { Agent } from '@/models/Agent';
import { AgentAvatar } from './AgentAvatar';
import { cn } from '@/lib/utils';

interface AgentListItemProps {
  agent: Partial<Agent>;
  onClick?: (agent: Partial<Agent>) => void;
  className?: string;
}

export const AgentListItem: React.FC<AgentListItemProps> = ({
  agent,
  onClick,
  className,
}) => {
  return (
    <button
      onClick={() => onClick?.(agent)}
      className={cn(
        'w-full flex items-center gap-loop-2 p-loop-1 pl-loop-1 pr-loop-2 py-loop-1',
        'rounded-[24px] bg-neutral-grayscale-90 hover:bg-neutral-grayscale-80',
        'border border-transparent hover:border-neutral-grayscale-60',
        'transition-all duration-200',
        'text-left cursor-pointer',
        className
      )}
    >
      <AgentAvatar agent={agent} size="sm" className="shrink-0" />
      <span className="text-md font-normal text-text-neutral-inverse-primary truncate">
        {agent.name}
      </span>
    </button>
  );
};
