import { cn } from '@/lib/utils';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  FolderOpen,
} from 'lucide-react';
import { forwardRef } from 'react';

interface SizeToggleProps {
  isMaximized: boolean;
  onMaximize: () => void;
  onMinimize: () => void;
  className?: string;
  buttonClassName?: string;
  maximizeTitle?: string;
  minimizeTitle?: string;
  orientation?: 'vertical' | 'horizontal';
  reverse?: boolean;
}

export const SizeToggle = forwardRef<HTMLDivElement, SizeToggleProps>(
  (
    {
      isMaximized,
      onMaximize,
      onMinimize,
      className = '',
      buttonClassName = '',
      maximizeTitle = 'Maximize',
      minimizeTitle = 'Minimize',
      orientation = 'vertical',
      reverse = false,
    },
    ref,
  ) => {
    const handleClick = () => {
      if (isMaximized) {
        onMinimize();
      } else {
        onMaximize();
      }
    };

    const renderIcon = () => {
      if (orientation === 'horizontal') {
        if (reverse) {
          return isMaximized ? (
            <ArrowLeft className="h-4 w-4 text-neutral-grayscale-90" />
          ) : (
            <ArrowRight className="h-4 w-4 text-neutral-grayscale-90" />
          );
        } else {
          return isMaximized ? (
            <ArrowRight className="h-4 w-4 text-neutral-grayscale-90" />
          ) : (
            <FolderOpen size={20} fill="currentColor" />
          );
        }
      }
      // Default vertical
      if (reverse) {
        return isMaximized ? (
          <ArrowUp className="h-4 w-4 text-neutral-grayscale-90" />
        ) : (
          <ArrowDown className="h-4 w-4 text-neutral-grayscale-90" />
        );
      } else {
        return isMaximized ? (
          <ArrowDown className="h-4 w-4 text-neutral-grayscale-90" />
        ) : (
          <ArrowUp className="h-4 w-4 text-neutral-grayscale-90" />
        );
      }
    };

    return (
      <div ref={ref} className={cn('flex items-center gap-loop-2', className)}>
        <button
          onClick={handleClick}
          className={cn(
            'flex items-center justify-center w-loop-8 h-loop-8 rounded-full bg-neutral-grayscale-20 hover:bg-neutral-grayscale-30 transition-colors',
            buttonClassName,
          )}
          title={isMaximized ? minimizeTitle : maximizeTitle}
        >
          {renderIcon()}
        </button>
      </div>
    );
  },
);

SizeToggle.displayName = 'SizeToggle';
