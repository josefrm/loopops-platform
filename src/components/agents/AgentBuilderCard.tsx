import { AgentAvatar } from '@/components/ui/agents/AgentAvatar';
import { Card, CardHeader } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Agent } from '@/models/Agent';
import { MoreVertical } from 'lucide-react';
import React from 'react';

// Flexible agent type that can handle both full Agent and simplified team agent
type FlexibleAgent =
  | Agent
  | {
      id: string;
      name?: string;
      agent_name?: string;
      key?: string;
      color?: string;
      agent_color?: string;
      role?: string;
      prompt?: string;
      agent_prompt?: string;
    };

interface DropdownAction {
  label: string;
  onClick: () => void;
}

interface AgentBuilderCardProps {
  agent: FlexibleAgent;
  showDropdown?: boolean;
  isClickable?: boolean;
  onClick?: (agent: FlexibleAgent) => void;
  dropdownActions?: DropdownAction[];
  className?: string;
  selected?: boolean;
}

export const AgentBuilderCard: React.FC<AgentBuilderCardProps> = ({
  agent,
  showDropdown = false,
  isClickable = false,
  onClick,
  dropdownActions = [],
  className = '',
  selected = false,
}) => {
  const handleCardClick = () => {
    if (isClickable && onClick) {
      onClick(agent);
    }
  };

  const getAgentPrompt = () => {
    if ('agent_prompt' in agent) return agent.agent_prompt;
    if ('prompt' in agent) return agent.prompt;
    return '';
  };

  const selectedHoverClass = `opacity-80 hover:opacity-100 transition-opacity duration-300 text-neutral-grayscale-60`;
  const defaultClass = `bg-[#131313] text-white border-neutral-grayscale-70 text-neutral-grayscale-30`;
  const selectedClass = `bg-card text-black border-neutral-grayscale-70 text-neutral-grayscale-60`;
  const defaultHoverClass = `hover:bg-card hover:text-black hover:border-neutral-grayscale-70 hover:shadow-md`;

  // Determine which classes to use based on selected state
  const baseClass = selected ? selectedClass : defaultClass;
  const hoverClass = selected ? selectedHoverClass : defaultHoverClass;

  return (
    <Card
      key={agent.id}
      className={`cursor-pointer group transition-all duration-300 w-full relative rounded-sm p-loop-4 h-[83px]
        ${baseClass}
        ${hoverClass}
       ${className}`}
      onClick={handleCardClick}
    >
      {/* Absolutely positioned dropdown menu */}
      {showDropdown && dropdownActions.length > 0 && (
        <div className="absolute top-loop-4 right-loop-4 z-1 h-loop-5 w-loop-5 flex items-center ">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div
                className={`p-0 transition-colors duration-300 ${
                  selected
                    ? 'text-slate-600 hover:text-slate-800 hover:bg-slate-100'
                    : 'text-slate-400 hover:text-slate-800 hover:bg-white/20 group-hover:text-slate-800'
                }`}
                onClick={(e) => e.stopPropagation()} // Prevent card click when dropdown is clicked
              >
                <MoreVertical className="w-4 h-4" />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {dropdownActions.map((action, actionIndex) => (
                <DropdownMenuItem
                  key={actionIndex}
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent card click when dropdown item is clicked
                    action.onClick();
                  }}
                  className="cursor-pointer"
                >
                  {action.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      <CardHeader className="p-0 w-[90%] max-w-full">
        <div className="flex items-center space-x-loop-2 vertical w-full overflow-hidden">
          {/** Avatar icon and name */}
          <AgentAvatar
            agent={agent}
            size="md"
            index={0}
            avatarClassName="w-loop-10 h-loop-10 cursor-pointer flex-shrink-0"
            className="w-full min-w-0"
          >
            {getAgentPrompt() && (
              <p
                className={`transition-colors duration-300 line-clamp-1 truncate pr-loop-1 ${
                  selected
                    ? 'text-neutral-grayscale-60 group-hover:text-neutral-grayscale-60'
                    : 'text-neutral-grayscale-30 group-hover:text-black'
                }`}
                style={{
                  fontFamily: 'Inter',
                  fontSize: '12px',
                  fontStyle: 'normal',
                  fontWeight: 400,
                  lineHeight: 'normal',
                  letterSpacing: '-0.36px',
                }}
              >
                {getAgentPrompt()}
              </p>
            )}
          </AgentAvatar>
        </div>
      </CardHeader>
    </Card>
  );
};
