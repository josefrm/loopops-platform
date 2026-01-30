import { type FileType } from '@/hooks/useFileFilters';
import { ListFilter } from 'lucide-react';
import React from 'react';
import { ControlIcon } from './ControlIcon';

export interface FileTypeFilterOption {
  name: string;
  value: FileType;
  action: () => void;
}

export interface FileTypeFilterProps {
  /** Array of filter options */
  options: FileTypeFilterOption[];
  /** Dropdown alignment */
  dropdownAlign?: 'start' | 'end';
  /** Custom icon (optional) */
  icon?: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Reusable file type filter component using ControlIcon dropdown
 */
export const FileTypeFilter: React.FC<FileTypeFilterProps> = ({
  options,
  dropdownAlign = 'end',
  icon = <ListFilter size={16} />,
  className,
}) => {
  return (
    <ControlIcon
      type="filter"
      icon={icon}
      dropdownOptions={options.map((option) => ({
        name: option.name,
        action: option.action,
      }))}
      dropdownAlign={dropdownAlign}
      className={className}
    />
  );
};
