import React from 'react';
import { Input } from '@/components/ui/input';
import { Search, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InputSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  isLoading?: boolean;
  variant?: 'default' | 'dark';
  size?: 'sm' | 'md' | 'lg';
}

export const InputSearch: React.FC<InputSearchProps> = ({
  value,
  onChange,
  placeholder = 'Search...',
  className = '',
  isLoading = false,
  variant = 'default',
  size = 'md',
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'h-8 pl-4 pr-10 py-2 text-sm';
      case 'md':
        return 'h-loop-8 pl-4 pr-10 py-2 text-base';
      case 'lg':
        return 'h-10 pl-4 pr-12 py-3 text-base';
      default:
        return 'h-loop-8 pl-4 pr-10 py-2 text-base';
    }
  };

  const getVariantClasses = () => {
    switch (variant) {
      case 'dark':
        return 'bg-transparent border-neutral-grayscale-40';
      case 'default':
      default:
        return 'border-neutral-grayscale-30';
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'sm':
        return 'w-3 h-3';
      case 'md':
        return 'w-4 h-4';
      case 'lg':
        return 'w-5 h-5';
      default:
        return 'w-4 h-4';
    }
  };

  const getIconPosition = () => {
    switch (size) {
      case 'sm':
        return 'right-2';
      case 'md':
        return 'right-loop-2';
      case 'lg':
        return 'right-4';
      default:
        return 'right-loop-2';
    }
  };

  return (
    <div className="relative">
      <Input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        className={cn(
          getSizeClasses(),
          getVariantClasses(),
          'border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent rounded-sm',
          className,
        )}
      />
      {isLoading ? (
        <Loader2
          className={cn(
            'absolute top-1/2 transform -translate-y-1/2 text-neutral-grayscale-50 animate-spin',
            getIconPosition(),
            getIconSize(),
          )}
        />
      ) : (
        <Search
          className={cn(
            'absolute top-1/2 transform -translate-y-1/2',
            variant === 'dark'
              ? 'text-neutral-grayscale-40'
              : 'text-neutral-grayscale-50',
            getIconPosition(),
            getIconSize(),
          )}
        />
      )}
    </div>
  );
};
