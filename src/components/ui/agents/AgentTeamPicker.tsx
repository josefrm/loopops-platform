import { AgentAvatar } from '@/components/ui/agents/AgentAvatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Agent } from '@/models/Agent';
import { Team } from '@/models/Team';
import React, { useEffect, useState } from 'react';

export interface AgentTeamOption {
  id: string;
  type: 'agent' | 'team';
  agent?: Agent;
  team?: Team;
  selected?: boolean;
}

interface AgentTeamPickerProps {
  trigger: React.ReactNode;
  options: AgentTeamOption[];
  onSelect: (option: AgentTeamOption) => void;
  maxItemsPerColumn?: number;
  className?: string;
  contentClassName?: string;
  align?: 'start' | 'center' | 'end';
  variant?: 'dark' | 'light'; // Add variant prop
  removeOnSelect?: boolean; // Optional prop to control if option should be removed from dropdown on select
}

export const AgentTeamPicker: React.FC<AgentTeamPickerProps> = ({
  trigger,
  options,
  onSelect,
  maxItemsPerColumn = 6,
  className = '',
  contentClassName = '',
  align = 'start',
  variant = 'dark', // Default to dark mode
  removeOnSelect = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // Check if there are any available options (not selected)
  const availableOptions = options.filter((option) => !option.selected);

  // Close dropdown if no options are available
  useEffect(() => {
    if (availableOptions.length === 0 && isOpen) {
      setIsOpen(false);
    }
  }, [availableOptions.length, isOpen]);
  // Split options into columns based on maxItemsPerColumn
  const createColumns = () => {
    const columns: AgentTeamOption[][] = [];
    // Only include available (non-selected) options
    for (let i = 0; i < availableOptions.length; i += maxItemsPerColumn) {
      columns.push(availableOptions.slice(i, i + maxItemsPerColumn));
    }
    return columns;
  };

  const columns = createColumns();

  const handleSelect = (option: AgentTeamOption) => {
    // Always call onSelect first to ensure the action is performed
    onSelect(option);

    // Always close the dropdown after selection, regardless of removeOnSelect value
    setIsOpen(false);

    // If removeOnSelect is true, handle removal logic for future reopening
    if (removeOnSelect) {
      // Close dropdown after selection if no more options are available
      const remainingOptions = availableOptions.filter(
        (opt) => opt.id !== option.id,
      );
      if (remainingOptions.length === 0) {
        setIsOpen(false);
      }
    }
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
          onClick={() => handleSelect(option)}
          className={`transition-all duration-200 p-loop-1 rounded-sm group ${
            option.selected
              ? 'bg-neutral-grayscale-40 opacity-50 cursor-not-allowed'
              : 'cursor-pointer'
          } ${
            variant === 'dark'
              ? 'hover:bg-white hover:text-black'
              : 'hover:bg-black hover:text-white'
          }`}
        >
          {isAgent && (
            <AgentAvatar
              agent={option.agent!}
              size="sm"
              className="transition-opacity duration-200 w-full space-x-loop-2"
              nameClassName={
                option.selected
                  ? 'text-neutral-grayscale-30'
                  : variant === 'dark'
                  ? 'text-neutral-grayscale-30 group-hover:text-black'
                  : 'text-black group-hover:text-white'
              }
              avatarClassName={`${option.selected ? 'opacity-50' : ''}`}
            />
          )}
          {isTeam && (
            <AgentAvatar
              agent={option.team! as any}
              size="sm"
              className="transition-opacity duration-200 space-x-loop-2"
              nameClassName={
                option.selected
                  ? 'text-neutral-grayscale-30'
                  : variant === 'dark'
                  ? 'text-neutral-grayscale-30 group-hover:text-black'
                  : 'text-black group-hover:text-white'
              }
              avatarClassName={`${option.selected ? 'opacity-50' : ''}`}
            />
          )}
        </div>

        {/* Divider - show if not the last item in column and not the last item overall */}
        {!isLastInColumn && (
          <div
            className={`w-full my-loop-1 ${
              variant === 'dark'
                ? 'bg-neutral-grayscale-70'
                : 'bg-neutral-grayscale-30'
            }`}
            style={{
              height: '1px',
            }}
          />
        )}
      </div>
    );
  };

  return (
    <div className={className}>
      <DropdownMenu
        open={isOpen && availableOptions.length > 0}
        onOpenChange={setIsOpen}
      >
        <DropdownMenuTrigger asChild disabled={availableOptions.length === 0}>
          {trigger}
        </DropdownMenuTrigger>
        {availableOptions.length > 0 && (
          <DropdownMenuContent
            align={align}
            className={`p-0 border-none shadow-lg ${contentClassName}`}
            style={{
              background: variant === 'dark' ? '#0F0F0F' : '#FFFFFF',
              borderRadius: '16px',
            }}
          >
            <div className="flex p-loop-4 gap-loop-4 flex-direction-row align-items-flex-start">
              {columns.map((column, columnIndex) => (
                <div
                  key={columnIndex}
                  className="flex flex-col flex-start min-w-[200px]"
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
          </DropdownMenuContent>
        )}
      </DropdownMenu>
    </div>
  );
};
