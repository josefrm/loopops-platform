import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface ClosableBadgeProps {
  children: React.ReactNode;
  onClose?: () => void;
  variant?: 'dark' | 'light';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const ClosableBadge: React.FC<ClosableBadgeProps> = ({
  children,
  onClose,
  variant = 'dark',
  size = 'md',
  className = '',
}) => {
  // Size configurations
  const sizeConfig = {
    sm: {
      maxWidth: 'max-w-[95px]',
      padding: 'px-2 py-0.5',
      height: 'h-6',
      fontSize: 'text-md',
      iconSize: 'w-3 h-3',
      spacing: 'ml-1',
    },
    md: {
      maxWidth: 'max-w-[119px]',
      padding: 'px-2.5 py-1',
      height: 'h-7',
      fontSize: 'text-md',
      iconSize: 'w-loop-5 h-loop-5',
      spacing: 'ml-1.5',
    },
    lg: {
      maxWidth: 'max-w-[150px]',
      padding: 'px-3 py-1.5',
      height: 'h-8',
      fontSize: 'text-md',
      iconSize: 'w-4 h-4',
      spacing: 'ml-2',
    },
  };

  const currentSize = sizeConfig[size];

  return (
    <Badge
      variant="outline"
      className={`${currentSize.padding} ${
        currentSize.fontSize
      } font-medium inline-flex items-center ${
        currentSize.height
      } border-none ${currentSize.maxWidth} ${
        variant === 'dark'
          ? 'text-neutral-grayscale-30 bg-white/10'
          : 'text-black bg-neutral-grayscale-30'
      } ${className}`}
    >
      <span className="truncate">{children}</span>
      {onClose && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className={`${
            currentSize.spacing
          } p-0 hover:bg-transparent hover:text-brand-accent-50 ${
            variant === 'dark' ? 'text-neutral-grayscale-30' : 'text-black'
          }`}
          title="Remove"
        >
          <X className={currentSize.iconSize} />
        </Button>
      )}
    </Badge>
  );
};
