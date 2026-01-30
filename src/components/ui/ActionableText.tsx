import { LucideIcon } from 'lucide-react';
import React from 'react';

interface ActionableTextProps {
  text: string;
  icon?: LucideIcon | any;
  onClick?: () => void;
  className?: string;
  textClassName?: string;
  iconClassName?: string;
  disabled?: boolean;
}

export const ActionableText = React.forwardRef<
  HTMLDivElement,
  ActionableTextProps
>(
  (
    {
      text,
      icon: Icon,
      onClick,
      className = '',
      textClassName = '',
      iconClassName = '',
      disabled = false,
    },
    ref,
  ) => {
    return (
      <div
        ref={ref}
        className={`flex items-center gap-2 h-loop-6 ${
          onClick && !disabled
            ? 'cursor-pointer hover:opacity-80 transition-opacity'
            : ''
        } ${className}`}
        onClick={onClick && !disabled ? onClick : undefined}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick && !disabled ? 0 : undefined}
        onKeyDown={
          onClick && !disabled
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onClick();
                }
              }
            : undefined
        }
      >
        {Icon && <Icon className={`${iconClassName || 'text-current'}`} />}
        <span
          className={`text-sm font-semibold underline ${
            disabled ? 'opacity-50' : ''
          } ${textClassName || 'text-white'}`}
        >
          {text}
        </span>
      </div>
    );
  },
);

ActionableText.displayName = 'ActionableText';
