import * as React from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FilterableSelectOption {
  value: string;
  label: string;
}

interface FilterableSelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  options: FilterableSelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  className?: string;
  disabled?: boolean;
}

export const FilterableSelect: React.FC<FilterableSelectProps> = ({
  value,
  onValueChange,
  options,
  placeholder = 'Select an option...',
  searchPlaceholder = 'Type to search...',
  emptyMessage = 'No options found',
  className,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [filteredOptions, setFilteredOptions] = React.useState(options);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Find the selected option
  const selectedOption = options.find((option) => option.value === value);

  // Filter options based on search term
  React.useEffect(() => {
    if (!searchTerm) {
      setFilteredOptions(options);
    } else {
      const filtered = options.filter((option) =>
        option.label.toLowerCase().startsWith(searchTerm.toLowerCase()),
      );
      setFilteredOptions(filtered);
    }
  }, [searchTerm, options]);

  // Focus input when dropdown opens
  React.useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    }
  }, [isOpen]);

  // Handle clicking outside to close
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (selectedValue: string) => {
    onValueChange?.(selectedValue);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleTriggerClick = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      setSearchTerm('');
    } else if (e.key === 'ArrowDown' && !isOpen) {
      setIsOpen(true);
    }
  };

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      {/* Trigger */}
      <div
        className={cn(
          'flex h-9 w-full items-center justify-between rounded-md border border-gray-600 bg-transparent px-3 py-2 text-sm text-white cursor-pointer',
          disabled && 'cursor-not-allowed opacity-50',
          isOpen && 'border-blue-500 ring-1 ring-blue-500',
        )}
        onClick={handleTriggerClick}
        onKeyDown={handleKeyDown}
        tabIndex={disabled ? -1 : 0}
      >
        {isOpen ? (
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={searchPlaceholder}
            className="flex-1 bg-transparent outline-none text-white placeholder:text-gray-400"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && filteredOptions.length > 0) {
                handleSelect(filteredOptions[0].value);
              }
              e.stopPropagation();
            }}
          />
        ) : (
          <span
            className={cn(
              'truncate',
              !selectedOption ? 'text-gray-400' : 'text-white',
            )}
          >
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        )}
        <ChevronDown
          className={cn(
            'h-4 w-4 text-gray-400 transition-transform',
            isOpen && 'rotate-180',
          )}
        />
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-60 overflow-auto rounded-md border border-gray-600 bg-gray-800 shadow-lg">
          {filteredOptions.length === 0 ? (
            <div className="flex items-center justify-center py-6 text-sm text-gray-400">
              <Search className="mr-2 h-4 w-4" />
              {emptyMessage}
            </div>
          ) : (
            <div className="py-1">
              {filteredOptions.map((option) => (
                <div
                  key={option.value}
                  className={cn(
                    'relative flex w-full cursor-pointer select-none items-center rounded-sm py-2 pl-8 pr-2 text-sm text-white hover:bg-gray-700 focus:bg-gray-700',
                    value === option.value && 'bg-gray-700',
                  )}
                  onClick={() => handleSelect(option.value)}
                >
                  <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                    {value === option.value && (
                      <Check className="h-4 w-4 text-blue-400" />
                    )}
                  </span>
                  <span className="truncate">{option.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
