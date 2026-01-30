import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
import * as React from 'react';

interface ColorPickerProps {
  value?: string;
  onValueChange?: (color: string) => void;
  className?: string;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  triggerRef?: React.RefObject<HTMLElement>;
}

const availableColors = [
  '#841380',
  '#6633B0',
  '#3C4BB5',
  '#135BAA',
  '#197585',
  '#099494',
  '#348C65',
  '#9C3698',
  '#8B5AD0',
  '#5D6DDE',
  '#347ECF',
  '#3498AA',
  '#39AEAE',
  '#49A97F',
  '#BF77BD',
  '#AB88DE',
  '#8690D6',
  '#6A99CB',
  '#74AAB3',
  '#6FBFBF',
  '#88C8AC',
  '#80933C',
  '#9E9537',
  '#C18B30',
  '#CC6C3E',
  '#CE5543',
  '#C64273',
  '#9C3982',
  '#98AD4D',
  '#BEB342',
  '#EEAA37',
  '#F7834A',
  '#F66F5B',
  '#EF4E8A',
  '#CB4AAA',
  '#BCCB86',
  '#DFD67B',
  '#F5C473',
  '#F9AE89',
  '#F7A195',
  '#F689B1',
  '#D688C2',
];

// Remove duplicates
const uniqueColors = Array.from(new Set(availableColors));

export const ColorPicker: React.FC<ColorPickerProps> = ({
  value,
  onValueChange,
  className,
  isOpen: externalIsOpen,
  onOpenChange,
  triggerRef,
}) => {
  const [internalIsOpen, setInternalIsOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Use external state if provided, otherwise use internal state
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;
  const setIsOpen = onOpenChange || setInternalIsOpen;

  // Handle clicking outside to close
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, setIsOpen]);

  const handleColorSelect = (color: string) => {
    onValueChange?.(color);
    setIsOpen(false);
  };

  // Calculate dropdown position based on trigger element
  const getDropdownStyle = () => {
    if (!triggerRef?.current || !isOpen) return {};

    const triggerRect = triggerRef.current.getBoundingClientRect();
    return {
      position: 'fixed' as const,
      top: triggerRect.bottom + 8,
      left: triggerRect.left,
      zIndex: 9999,
    };
  };

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* Dropdown */}
      {isOpen && (
        <div
          className={cn(
            'w-[206px] h-[169px] m-[1px] rounded-sm bg-[#0F0F0F] p-3 shadow-2xl border border-gray-600 overflow-hidden',
            triggerRef ? 'fixed' : 'absolute top-full left-0 mt-2',
          )}
          style={triggerRef ? getDropdownStyle() : { zIndex: 9999 }}
        >
          {/* Color grid - scrollable container */}
          <div className="h-full overflow-y-auto scrollbar-hide smooth-scroll pl-loop-1">
            <div className="grid grid-cols-7 gap-1">
              {uniqueColors.map((color) => (
                <div
                  key={color}
                  className={cn(
                    'relative h-[20px] w-[20px] rounded-[5px] cursor-pointer transition-all hover:scale-105',
                    value === color &&
                      'ring-2 ring-blue-400 ring-offset-1 ring-offset-[#0F0F0F]',
                  )}
                  style={{ backgroundColor: color }}
                  onClick={() => handleColorSelect(color)}
                >
                  {/* Check icon for selected color */}
                  {value === color && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Check className="h-4 w-4 text-white drop-shadow-lg" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
