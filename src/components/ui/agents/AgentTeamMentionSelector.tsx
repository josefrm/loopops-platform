import { AgentAvatar } from '@/components/ui/agents/AgentAvatar';
import { Agent } from '@/models/Agent';
import { Team } from '@/models/Team';
import React from 'react';

export interface AgentTeamOption {
  id: string;
  type: 'agent' | 'team';
  agent?: Agent;
  team?: Team;
  selected?: boolean;
}

interface AgentTeamMentionSelectorProps {
  options: AgentTeamOption[];
  onSelect: (option: AgentTeamOption) => void;
  maxItemsPerColumn?: number;
  className?: string;
  variant?: 'dark' | 'light'; // Add variant prop
}

export const AgentTeamMentionSelector: React.FC<
  AgentTeamMentionSelectorProps
> = ({
  options,
  onSelect,
  maxItemsPerColumn = 6,
  className = '',
  variant = 'dark', // Default to dark mode
}) => {
  // Split options into columns based on maxItemsPerColumn
  const createColumns = () => {
    const columns: AgentTeamOption[][] = [];
    for (let i = 0; i < options.length; i += maxItemsPerColumn) {
      columns.push(options.slice(i, i + maxItemsPerColumn));
    }
    return columns;
  };

  const columns = createColumns();

  const handleSelect = (option: AgentTeamOption) => {
    onSelect(option);
  };

  const renderOption = (
    option: AgentTeamOption,
    index: number,
    isLastInColumn: boolean,
  ) => {
    const isAgent = option.type === 'agent' && option.agent;
    const isTeam = option.type === 'team' && option.team;

    return (
      <div key={option.id} className="w-full">
        <div
          onClick={() => !option.selected && handleSelect(option)}
          className={`transition-all duration-200 rounded-sm p-loop-1 group ${
            option.selected
              ? 'bg-gray-800 opacity-50 cursor-not-allowed'
              : 'cursor-pointer hover:bg-white hover:text-black'
          }`}
        >
          {isAgent && (
            <AgentAvatar
              agent={option.agent!}
              size="sm"
              className="transition-opacity duration-200"
              nameClassName={
                option.selected
                  ? 'text-neutral-grayscale-30'
                  : variant === 'dark'
                  ? 'text-neutral-grayscale-30 group-hover:text-black'
                  : 'text-black group-hover:text-black'
              }
              avatarClassName={`${option.selected ? 'opacity-50' : ''}`}
            />
          )}
          {isTeam && (
            <AgentAvatar
              agent={option.team! as any}
              size="sm"
              className="transition-opacity duration-200"
              nameClassName={
                option.selected
                  ? 'text-neutral-grayscale-30'
                  : variant === 'dark'
                  ? 'text-neutral-grayscale-30 group-hover:text-black'
                  : 'text-black group-hover:text-black'
              }
              avatarClassName={`${option.selected ? 'opacity-50' : ''}`}
            />
          )}
        </div>

        {/* Divider - show if not the last item in column and not the last item overall */}
        {!isLastInColumn && (
          <div
            className="w-full"
            style={{
              background: '#262626',
              height: '1px',
              marginTop: '4px',
              marginBottom: '4px',
            }}
          />
        )}
      </div>
    );
  };

  return (
    <div
      className={`border-none shadow-lg ${className}`}
      style={{
        background: variant === 'dark' ? 'var(--Gray-7, #0F0F0F)' : '#FFFFFF',
        borderRadius: '16px',
        padding: '16px',
      }}
    >
      <div
        className="flex"
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: '16px',
        }}
      >
        {columns.map((column, columnIndex) => (
          <div
            key={columnIndex}
            className="flex flex-col"
            style={{
              alignItems: 'flex-start',
              minWidth: '200px',
            }}
          >
            {column.map((option, optionIndex) =>
              renderOption(
                option,
                optionIndex,
                optionIndex === column.length - 1,
              ),
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
