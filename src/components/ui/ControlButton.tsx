import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import React from 'react';
import { Link } from 'react-router-dom';
import { SimpleTooltip } from './SimpleTooltip';

// Style configurations for different types
export type ControlButtonType =
  | 'default'
  | 'defaultV2'
  | 'gray_black'
  | 'gray'
  | 'white'
  | 'whiteInverse'
  | 'transparent'
  | 'added'
  | 'transparent_brand'
  | 'black_n_white';

export type ControlButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const getTypeStyles = (
  type: ControlButtonType,
  disabled: boolean,
  active: boolean = false,
) => {
  const styles = {
    default: {
      normal:
        'bg-brand-accent-50 text-neutral-grayscale-0 border border-brand-accent-50',
      hover: 'hover:bg-neutral-grayscale-90 hover:border-neutral-grayscale-90',
      active: 'bg-neutral-grayscale-90 border-neutral-grayscale-90',
      disabled:
        'bg-neutral-grayscale-40 text-neutral-grayscale-30 border-neutral-grayscale-40',
    },
    gray_black: {
      normal: 'bg-neutral-grayscale-20 text-neutral-grayscale-90',
      hover:
        'hover:bg-neutral-grayscale-90 hover:border-neutral-grayscale-90 hover:text-white',
      active: 'bg-neutral-grayscale-90 border-neutral-grayscale-90 text-white',
      disabled:
        'bg-neutral-grayscale-40 text-neutral-grayscale-30 border-neutral-grayscale-40',
    },
    black_n_white: {
      normal:
        'bg-neutral-grayscale-0 text-neutral-grayscale-90 border border-neutral-grayscale-90',
      hover:
        'hover:bg-neutral-grayscale-90 hover:border-neutral-grayscale-90 hover:text-white',
      active: 'bg-neutral-grayscale-90 border-neutral-grayscale-90 text-white',
      disabled:
        'bg-neutral-grayscale-40 text-neutral-grayscale-30 border-neutral-grayscale-40',
    },
    gray: {
      normal: 'bg-neutral-grayscale-50 text-neutral-grayscale-0',
      hover:
        'hover:bg-neutral-grayscale-90 hover:border-neutral-grayscale-90 hover:text-white',
      active: 'bg-neutral-grayscale-90 border-neutral-grayscale-90 text-white',
      disabled:
        'bg-neutral-grayscale-40 text-neutral-grayscale-30 border-neutral-grayscale-40',
    },
    white: {
      normal: 'bg-neutral-grayscale-0 text-neutral-grayscale-90',
      hover: 'hover:bg-neutral-grayscale-90 hover:text-neutral-grayscale-0',
      active: 'bg-neutral-grayscale-90 text-neutral-grayscale-0',
      disabled: 'bg-neutral-grayscale-10 text-neutral-grayscale-40',
    },
    transparent: {
      normal:
        'bg-transparent text-neutral-grayscale-90 border border-neutral-grayscale-90',
      hover: 'hover:bg-neutral-grayscale-90 hover:text-neutral-grayscale-0',
      active: 'bg-neutral-grayscale-90 text-neutral-grayscale-0',
      disabled:
        'bg-neutral-grayscale-40 text-neutral-grayscale-30 border-neutral-grayscale-40',
    },
    transparent_brand: {
      normal:
        'bg-transparent text-brand-accent-50 border border-brand-accent-50',
      hover:
        'hover:bg-neutral-grayscale-90 hover:border hover:border-neutral-grayscale-90 hover:text-neutral-grayscale-0',
      active:
        'bg-neutral-grayscale-90 border border-neutral-grayscale-90 text-neutral-grayscale-0',
      disabled:
        'bg-neutral-grayscale-40 text-neutral-grayscale-30 border-neutral-grayscale-40',
    },
    added: {
      normal: 'bg-neutral-grayscale-20 text-system-success-50',
      hover: '',
      active: '',
      disabled:
        'bg-neutral-grayscale-40 text-neutral-grayscale-30 border-neutral-grayscale-40',
    },
    defaultV2: {
      normal:
        'bg-brand-accent-50 text-neutral-grayscale-0 border border-brand-accent-50',
      hover:
        'hover:bg-transparent hover:text-brand-accent-50 hover:border hover:border-brand-accent-50',
      active:
        'bg-transparent text-brand-accent-50 border border-brand-accent-50',
      disabled:
        'bg-neutral-grayscale-40 text-neutral-grayscale-30 border-neutral-grayscale-40',
    },
    whiteInverse: {
      normal:
        'bg-transparent text-neutral-grayscale-0 border border-neutral-grayscale-0',
      hover: 'hover:bg-neutral-grayscale-0 hover:text-neutral-grayscale-90',
      active: 'bg-neutral-grayscale-0 text-neutral-grayscale-90',
      disabled:
        'bg-neutral-grayscale-40 text-neutral-grayscale-30 border-neutral-grayscale-40',
    },
  };

  const typeStyle = styles[type];

  if (disabled) {
    return typeStyle.disabled;
  }

  if (active) {
    return `${typeStyle.normal} ${typeStyle.active} ${typeStyle.hover}`;
  }

  return `${typeStyle.normal} ${typeStyle.hover}`;
};

const getSizeStyles = (size: ControlButtonSize) => {
  const sizeStyles = {
    xs: 'h-loop-3 w-loop-14', // 12px x 56px
    sm: 'h-loop-6 w-loop-20', // 24px x 80px
    md: 'h-loop-8 w-loop-24', // 32px x 96px
    lg: 'h-loop-10 w-loop-32', // 40px x 128px
    xl: 'h-loop-8 w-[150px]', // 32px x 150px
  };

  return sizeStyles[size];
};

const getFontSize = (size: ControlButtonSize) => {
  const fontSizes = {
    xs: 11, // 11px
    sm: 12, // 12px
    md: 13, // 13px
    lg: 14, // 14px
  };

  return fontSizes[size];
};

interface ControlButtonProps {
  text: string;
  label?: string; // Optional tooltip label
  onClick?: (e: React.MouseEvent<HTMLElement>) => void;
  to?: string;
  disabled?: boolean;
  isLoading?: boolean;
  type?: ControlButtonType;
  size?: ControlButtonSize;
  fontSize?: number; // Optional font size override
  className?: string;
  icon?: React.ReactNode; // Optional icon to display on the left of the text
  active?: boolean;
}

export const ControlButton: React.FC<ControlButtonProps> = ({
  text,
  label,
  onClick,
  to,
  disabled = false,
  isLoading = false,
  type = 'default',
  size = 'md',
  fontSize,
  className,
  icon,
  active = false,
}) => {
  const baseClasses =
    'rounded-lg flex items-center justify-center transition-all duration-200 cursor-pointer';

  const buttonClasses = cn(
    baseClasses,
    getSizeStyles(size),
    getTypeStyles(type, disabled || isLoading, active),
    (disabled || isLoading) && 'cursor-not-allowed',
    className,
  );

  // Apply font size to control text size
  const textStyle = {
    fontSize: `${fontSize || getFontSize(size)}px`,
  };

  const buttonContent = (
    <div className="flex items-center justify-center gap-loop-2">
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        icon && <span className="flex-shrink-0">{icon}</span>
      )}
      <span style={textStyle}>{text}</span>
    </div>
  );

  const ButtonElement =
    to && !disabled && !isLoading ? (
      <Link to={to} className={buttonClasses}>
        {buttonContent}
      </Link>
    ) : (
      <button
        onClick={disabled || isLoading ? undefined : onClick}
        disabled={disabled || isLoading}
        className={buttonClasses}
      >
        {buttonContent}
      </button>
    );

  // Only wrap with tooltip if label is provided
  if (label) {
    return (
      <SimpleTooltip content={label} side="top">
        {ButtonElement}
      </SimpleTooltip>
    );
  }

  return ButtonElement;
};
