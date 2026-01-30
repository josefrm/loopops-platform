import { cn } from '@/lib/utils';
import { AlertTriangle, Info, XCircle } from 'lucide-react';
import React from 'react';

export type WarningParams = {
  active: boolean;
  message: string;
  type?: 'warning' | 'info' | 'error';
  title?: string;
};

interface WarningBannerProps {
  message: string;
  title?: string;
  type?: 'warning' | 'info' | 'error';
  className?: string;
}

export const WarningBanner: React.FC<WarningBannerProps> = ({
  message,
  title,
  type = 'warning',
  className,
}) => {
  const getStyles = () => {
    switch (type) {
      case 'warning':
        return 'bg-system-warning-10 border-system-warning-20 text-system-warning-50';
      case 'error':
        return 'bg-system-error-10 border-system-error-20 text-system-error-50';
      case 'info':
        return 'bg-system-info-10 border-system-info-20 text-system-info-50';
      default:
        return 'bg-system-warning-10 border-system-warning-20 text-system-warning-50';
    }
  };

  const getIcon = () => {
    const size = 20;
    switch (type) {
      case 'warning':
        return <AlertTriangle size={size} className="flex-shrink-0" />;
      case 'error':
        return <XCircle size={size} className="flex-shrink-0" />;
      case 'info':
        return <Info size={size} className="flex-shrink-0" />;
      default:
        return <AlertTriangle size={size} className="flex-shrink-0" />;
    }
  };

  return (
    <div
      className={cn(
        'flex items-start gap-loop-2 p-loop-6 rounded-sm border text-base',
        getStyles(),
        className,
      )}
    >
      <div className="flex items-center gap-loop-2">
        {getIcon()}
        {title && (
          <span className="font-bold uppercase tracking-wide">{title}</span>
        )}
        <span className="leading-relaxed font-medium">{message}</span>
      </div>
    </div>
  );
};
