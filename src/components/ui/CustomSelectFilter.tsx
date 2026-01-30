import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { ListFilter, LucideIcon } from 'lucide-react';
import React from 'react';

interface FilterProperty {
  key: string;
  name: string;
  description: string;
}

interface CustomSelectFilterProps {
  filterInitialValue?: string;
  selectedProperty: FilterProperty | null;
  availableProperties: FilterProperty[];
  onPropertyChange: (property: any) => void;
  variant?: 'light' | 'dark';
  icon?: LucideIcon;
  classNames?: string;
  keepOpen?: boolean; // For debugging purposes
}

export const CustomSelectFilter: React.FC<CustomSelectFilterProps> = ({
  filterInitialValue = 'All',
  selectedProperty,
  availableProperties,
  onPropertyChange,
  variant = 'light',
  icon: IconComponent = ListFilter,
  classNames = '',
  keepOpen = false,
}) => {
  // Theme-based styles
  const triggerStyles =
    variant === 'dark'
      ? 'bg-custom-black border border-neutral-grayscale-40 text-neutral-grayscale-40 hover:border-neutral-grayscale-30 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
      : 'bg-white border border-neutral-grayscale-15 hover:border-neutral-grayscale-30 focus:ring-2 focus:ring-blue-500 focus:border-transparent';

  const contentStyles =
    variant === 'dark'
      ? 'bg-custom-black border-neutral-grayscale-40 hover:text-black'
      : 'bg-neutral-grayscale-0 border-neutral-grayscale-20 shadow-lg';

  const itemStyles =
    variant === 'dark'
      ? 'text-neutral-grayscale-20 rounded-sm p-loop-1 hover:bg-neutral-grayscale-60 focus:bg-neutral-grayscale-60 hover:text-neutral-grayscale-20 focus:text-neutral-grayscale-20'
      : 'text-neutral-grayscale-50 rounded-xs p-loop-2 cursor-pointer transition-colors duration-200 focus:bg-neutral-grayscale-10 focus:text-neutral-grayscale-90 data-[state=checked]:bg-neutral-grayscale-10 data-[state=checked]:text-neutral-grayscale-90';

  const placeholderTextColor =
    variant === 'dark' ? 'text-neutral-grayscale-40' : 'text-gray-500';

  return (
    <Select
      open={keepOpen ? true : undefined}
      value={selectedProperty?.key}
      onValueChange={(value) => {
        const property = availableProperties.find((p) => p.key === value);
        if (property) onPropertyChange(property);
      }}
      onOpenChange={() => {
        // If keepOpen is true, prevent closing completely
        if (keepOpen) {
          return;
        }
      }}
    >
      <SelectTrigger
        className={`w-full h-loop-8 text-md ${triggerStyles} ${classNames}`}
        icon={IconComponent}
      >
        {selectedProperty ? (
          <SelectValue style={{ maxWidth: '212px' }}>
            <span className="truncate" title={selectedProperty.description}>
              {selectedProperty.name}
            </span>
          </SelectValue>
        ) : (
          <span className={placeholderTextColor}>{filterInitialValue}</span>
        )}
      </SelectTrigger>
      <SelectContent
        showDividers={false}
        className={cn(
          `cursor-pointer max-h-[300px] w-[var(--radix-select-trigger-width)] min-w-0 p-loop-4 rounded-md border ${contentStyles}`,
        )}
        onCloseAutoFocus={(e) => {
          if (keepOpen) {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
        onEscapeKeyDown={(e) => {
          if (keepOpen) {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
        onPointerDownOutside={(e) => {
          if (keepOpen) {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
        chevronClassName={
          variant === 'dark'
            ? placeholderTextColor
            : 'text-neutral-grayscale-50'
        }
      >
        {availableProperties.map((property) => (
          <SelectItem
            key={property.key}
            value={property.key}
            className={cn(`cursor-pointer`, itemStyles)}
          >
            <div className="flex items-center space-x-2 w-full">
              <span className="truncate" title={property.description}>
                {property.name}
              </span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
