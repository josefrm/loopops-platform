import React from 'react';
import { MessageSquare, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { useMainThreadStatus } from '@/hooks/useMainThreadStatus';
import { cn } from '@/lib/utils';

interface MainThreadStatusIndicatorProps {
  className?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const MainThreadStatusIndicator: React.FC<
  MainThreadStatusIndicatorProps
> = ({ className, showLabel = false, size = 'sm' }) => {
  const status = useMainThreadStatus();

  const sizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  const iconSize = sizeClasses[size];

  if (!status.isAuthenticated) {
    return null;
  }

  const getStatusDisplay = () => {
    if (status.isMainThreadLoading) {
      return {
        icon: (
          <Loader2
            className={cn(iconSize, 'animate-spin text-brand-accent-50')}
          />
        ),
        label: 'Initializing...',
        color: 'text-brand-accent-50',
      };
    }

    if (status.mainThreadError) {
      return {
        icon: <AlertCircle className={cn(iconSize, 'text-red-500')} />,
        label: 'Setup failed',
        color: 'text-red-500',
      };
    }

    if (status.hasMainThread) {
      return {
        icon: <CheckCircle className={cn(iconSize, 'text-green-500')} />,
        label: 'Ready',
        color: 'text-green-500',
      };
    }

    return {
      icon: (
        <MessageSquare className={cn(iconSize, 'text-neutral-grayscale-60')} />
      ),
      label: 'Waiting...',
      color: 'text-neutral-grayscale-60',
    };
  };

  const { icon, label, color } = getStatusDisplay();

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {icon}
      {showLabel && (
        <span className={cn('text-xs font-medium', color)}>{label}</span>
      )}
    </div>
  );
};

export const MainThreadStatusBadge: React.FC<
  MainThreadStatusIndicatorProps
> = ({ className, size = 'md' }) => {
  const status = useMainThreadStatus();

  if (!status.isAuthenticated) {
    return null;
  }

  const getStatusConfig = () => {
    if (status.isMainThreadLoading) {
      return {
        variant: 'loading',
        text: 'Setting up conversation history...',
        bgColor: 'bg-brand-accent-10',
        textColor: 'text-brand-accent-70',
        borderColor: 'border-brand-accent-30',
      };
    }

    if (status.mainThreadError) {
      return {
        variant: 'error',
        text: 'Conversation history unavailable',
        bgColor: 'bg-red-50',
        textColor: 'text-red-700',
        borderColor: 'border-red-200',
      };
    }

    if (status.hasMainThread) {
      return {
        variant: 'success',
        text: 'Conversation history ready',
        bgColor: 'bg-green-50',
        textColor: 'text-green-700',
        borderColor: 'border-green-200',
      };
    }

    return {
      variant: 'waiting',
      text: 'Preparing workspace...',
      bgColor: 'bg-neutral-grayscale-10',
      textColor: 'text-neutral-grayscale-70',
      borderColor: 'border-neutral-grayscale-30',
    };
  };

  const config = getStatusConfig();

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-medium',
        config.bgColor,
        config.textColor,
        config.borderColor,
        className,
      )}
    >
      <MainThreadStatusIndicator size={size} />
      <span>{config.text}</span>
    </div>
  );
};
