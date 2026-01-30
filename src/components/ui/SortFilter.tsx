import { type SortOption } from '@/hooks/useFileFilters';
import React from 'react';
import { ControlIcon } from './ControlIcon';
import { LowPriorityIcon } from './icons/LowPriorityIcon';

export interface SortFilterOption {
  name: string;
  value: SortOption;
  action: () => void;
}

export interface SortFilterProps {
  /** Array of sort options */
  options: SortFilterOption[];
  /** Dropdown alignment */
  dropdownAlign?: 'start' | 'end';
  /** Custom icon (optional) */
  icon?: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Optional click handler for the icon itself */
  onClick?: () => void;
}

/**
 * Reusable sort filter component using ControlIcon dropdown
 */
export const SortFilter: React.FC<SortFilterProps> = ({
  options,
  dropdownAlign = 'end',
  icon = <LowPriorityIcon width={16} height={16} />,
  className,
  onClick,
}) => {
  return (
    <ControlIcon
      type="filter"
      icon={icon}
      onClick={onClick}
      dropdownOptions={options.map((option) => ({
        name: option.name,
        action: option.action,
      }))}
      dropdownAlign={dropdownAlign}
      className={className}
    />
  );
};
