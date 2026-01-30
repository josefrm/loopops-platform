import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import React from 'react';

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

interface SelectDropdownProps {
  trigger: React.ReactNode;
  options: SelectOption[];
  onSelect: (value: string) => void;
  placeholder?: string;
  align?: 'start' | 'center' | 'end';
  className?: string;
  contentClassName?: string;
}

export const SelectDropdown: React.FC<SelectDropdownProps> = ({
  trigger,
  options,
  onSelect,
  placeholder = 'Select an option',
  align = 'start',
  className = '',
  contentClassName = '',
}) => {
  const handleSelect = (value: string, disabled?: boolean) => {
    if (!disabled) {
      onSelect(value);
    }
  };

  return (
    <div className={className}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
        <DropdownMenuContent align={align} className={contentClassName}>
          {options.length === 0 ? (
            <DropdownMenuItem disabled className="text-gray-500">
              {placeholder}
            </DropdownMenuItem>
          ) : (
            options.map((option) => (
              <DropdownMenuItem
                key={option.value}
                onClick={() => handleSelect(option.value, option.disabled)}
                className={`cursor-pointer ${
                  option.disabled
                    ? 'opacity-50 cursor-not-allowed pointer-events-none'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
                disabled={option.disabled}
              >
                <div className="flex flex-col w-full">
                  <span className={option.disabled ? 'text-gray-400' : ''}>
                    {option.label}
                  </span>
                  {option.description && (
                    <span
                      className={`text-xs ${
                        option.disabled
                          ? 'text-gray-400'
                          : 'text-gray-500 dark:text-gray-400'
                      }`}
                    >
                      {option.description}
                    </span>
                  )}
                </div>
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
