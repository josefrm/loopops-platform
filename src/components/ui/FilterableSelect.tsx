import { cn } from '@/lib/utils';
import { ChevronDown, Search } from 'lucide-react';
import * as React from 'react';

interface FilterableSelectOption {
  value: string;
  label: string;
  description?: string;
}

interface FilterableSelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  options: FilterableSelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  className?: string;
  triggerClassName?: string;
  disabled?: boolean;
  variant?: 'dark' | 'light';
  children?: React.ReactNode;
}

export const FilterableSelect: React.FC<FilterableSelectProps> = ({
  value,
  onValueChange,
  options,
  placeholder = 'Select an option...',
  searchPlaceholder = 'Type to search...',
  emptyMessage = 'No options found',
  className,
  triggerClassName,
  disabled = false,
  variant = 'dark',
  children,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [filteredOptions, setFilteredOptions] = React.useState(options);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const selectedOption = options.find((option) => option.value === value);

  // Theme-based styling
  const themeStyles = {
    dark: {
      trigger: ' bg-transparent text-white',
      triggerFocus: 'border-blue-500 ring-1 ring-blue-500',
      input: 'bg-transparent text-white placeholder:text-gray-400',
      selectedText: 'text-white',
      placeholderText: 'text-[13px] font-normal text-gray-400',
      dropdown: 'border-none bg-gray-900 rounded-[16px]',
      option: 'text-white hover:bg-gray-700 focus:bg-gray-700',
      optionSelected: 'bg-gray-700 text-blue-300',
      emptyText: 'text-gray-400',
      checkIcon: 'text-blue-400',
      descriptionText: 'text-gray-400',
    },
    light: {
      trigger: 'bg-white text-gray-900',
      triggerFocus: 'border-blue-500 ring-1 ring-blue-500',
      input: 'bg-white text-gray-900 placeholder:text-gray-500',
      selectedText: 'text-gray-900',
      placeholderText: 'text-[13px] font-normal text-gray-500',
      dropdown: 'border-none bg-white rounded-[16px]',
      option: 'text-gray-900 hover:bg-gray-100 focus:bg-gray-100',
      optionSelected: 'bg-blue-50 text-blue-700',
      emptyText: 'text-gray-500',
      checkIcon: 'text-blue-600',
      descriptionText: 'text-gray-500',
    },
  };

  const styles = themeStyles[variant];

  // Find the selected option

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
          'flex h-loop-8 w-full items-center justify-between rounded-sm border px-loop-2 py-loop-1 cursor-pointer relative',
          styles.trigger,
          disabled && 'cursor-not-allowed opacity-50',
          isOpen && styles.triggerFocus,
          triggerClassName,
        )}
        onClick={handleTriggerClick}
        onKeyDown={handleKeyDown}
        tabIndex={disabled ? -1 : 0}
      >
        {/* Children positioned absolutely before the input/placeholder */}
        {children && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10 pointer-events-none h-[18px]">
            {children}
          </div>
        )}

        {isOpen ? (
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={searchPlaceholder}
            className={cn(
              'flex-1 outline-none text-[13px] font-normal',
              styles.input,
              children && 'pl-loop-14',
            )}
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
              'truncate text-[13px] font-normal font-weight-400',
              !selectedOption ? styles.placeholderText : styles.selectedText,
              children && 'pl-loop-14',
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
        <div
          className={cn(
            'absolute top-full left-0 right-0 z-[9999] mt-1 overflow-hidden border shadow-2xl max-h-[200px]',
            styles.dropdown,
          )}
        >
          {filteredOptions.length === 0 ? (
            <div
              className={cn(
                'flex items-center justify-center py-loop-4 text-[13px]',
                styles.emptyText,
              )}
            >
              <Search className="mr-loop-2 h-4 w-4" />
              {emptyMessage}
            </div>
          ) : (
            <div className="py-1 max-h-[9rem] overflow-y-auto scrollbar-hide smooth-scroll">
              {filteredOptions.map((option) => (
                <div
                  key={option.value}
                  className={cn(
                    'relative flex w-full cursor-pointer select-none items-center rounded-sm py-3 pl-8 pr-2 text-[13px] transition-colors',
                    styles.option,
                    value === option.value && styles.optionSelected,
                  )}
                  onClick={() => handleSelect(option.value)}
                >
                  <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                    {/* {value === option.value && (
                      <Check className={cn('h-4 w-4', styles.checkIcon)} />
                    )} */}
                  </span>
                  <div className="flex flex-col truncate">
                    <span className="truncate font-normal text-[13px]">
                      {option.label}
                    </span>
                    {option.description && (
                      <span
                        className={cn(
                          'text-xs truncate',
                          styles.descriptionText,
                        )}
                      >
                        {option.description}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
