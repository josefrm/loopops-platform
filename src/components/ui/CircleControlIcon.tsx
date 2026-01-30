import { cn } from '@/lib/utils';
import React from 'react';
import { Link } from 'react-router-dom';

// Style configurations for different types
export type CircleControlIconType =
  | 'default'
  | 'gray_black'
  | 'gray'
  | 'white'
  | 'transparent'
  | 'added';

export type CircleControlIconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const getTypeStyles = (type: CircleControlIconType, disabled: boolean) => {
  const styles = {
    default: {
      normal:
        'bg-brand-accent-50 text-neutral-grayscale-0 border border-brand-accent-50',
      hover: 'hover:bg-neutral-grayscale-90 hover:border-neutral-grayscale-90',
      disabled:
        'bg-neutral-grayscale-40 text-neutral-grayscale-30 border-neutral-grayscale-40',
    },
    gray_black: {
      normal: 'bg-neutral-grayscale-20 text-neutral-grayscale-90',
      hover:
        'hover:bg-neutral-grayscale-90 hover:border-neutral-grayscale-90 hover:text-white',
      disabled:
        'bg-neutral-grayscale-40 text-neutral-grayscale-30 border-neutral-grayscale-40',
    },
    gray: {
      normal: 'bg-neutral-grayscale-20 text-neutral-grayscale-50',
      hover:
        'hover:bg-neutral-grayscale-90 hover:border-neutral-grayscale-90 hover:text-white',
      disabled:
        'bg-neutral-grayscale-20 text-neutral-grayscale-30 border-neutral-grayscale-20',
    },
    white: {
      normal: 'bg-neutral-grayscale-0 text-neutral-grayscale-40',
      hover:
        'hover:bg-neutral-grayscale-90 hover:border-neutral-grayscale-90 hover:text-white',
      disabled:
        'bg-neutral-grayscale-40 text-neutral-grayscale-30 border-neutral-grayscale-40',
    },
    transparent: {
      normal: 'bg-transparent text-neutral-grayscale-90',
      hover: 'hover:bg-neutral-grayscale-30 hover:text-neutral-grayscale-90',
      disabled:
        'bg-neutral-grayscale-40 text-neutral-grayscale-30 border-neutral-grayscale-40',
    },
    added: {
      normal: 'bg-neutral-grayscale-20 text-system-success-50',
      hover: '',
      disabled:
        'bg-neutral-grayscale-40 text-neutral-grayscale-30 border-neutral-grayscale-40',
    },
  };

  const typeStyle = styles[type];

  if (disabled) {
    return typeStyle.disabled;
  }

  return `${typeStyle.normal} ${typeStyle.hover}`;
};

const getSizeStyles = (size: CircleControlIconSize) => {
  const sizeStyles = {
    xs: 'w-loop-6 h-loop-6', // 24px x 24px
    sm: 'w-loop-7 h-loop-7', // 28px x 28px
    md: 'w-loop-8 h-loop-8', // 32px x 32px
    lg: 'w-loop-9 h-loop-9', // 36px x 36px
    xl: 'w-loop-10 h-loop-10', // 40px x 40px
  };

  return sizeStyles[size];
};

const getIconSize = (size: CircleControlIconSize) => {
  const iconSizes = {
    xs: 14,
    sm: 16,
    md: 18,
    lg: 20,
    xl: 22,
  };

  return iconSizes[size];
};

interface CircleControlIconProps extends Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  'type' | 'onClick'
> {
  icon: React.ReactNode;
  label?: string;
  onClick?: React.MouseEventHandler<HTMLElement>;
  to?: string;
  disabled?: boolean;
  type?: CircleControlIconType;
  size?: CircleControlIconSize;
  className?: string;
  active?: boolean;
  image?: string;
}

export const CircleControlIcon = React.forwardRef<
  HTMLButtonElement | HTMLAnchorElement,
  CircleControlIconProps
>(
  (
    {
      icon,
      label,
      onClick,
      to,
      disabled = false,
      type = 'default',
      size = 'md',
      className,
      active = false,
      image,
      ...props
    },
    ref,
  ) => {
    const baseClasses =
      'rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer';

    const buttonClasses = cn(
      baseClasses,
      getSizeStyles(size),
      getTypeStyles(type, disabled),
      disabled && 'cursor-not-allowed',
      className,
      active && 'text-system-success-50',
    );

    // Clone the icon with appropriate size
    const clonedIcon = React.isValidElement(icon)
      ? React.cloneElement(icon as React.ReactElement<any>, {
          size: getIconSize(size),
        })
      : icon;

    const buttonContent = image ? (
      <img
        src={image}
        alt={label || 'icon'}
        className="object-contain rounded-full"
        style={{ width: getIconSize(size), height: getIconSize(size) }}
      />
    ) : (
      <>{clonedIcon}</>
    );

    const ButtonElement =
      to && !disabled ? (
        <Link
          to={to}
          className={buttonClasses}
          ref={ref as React.Ref<HTMLAnchorElement>}
          {...(props as any)}
        >
          {buttonContent}
        </Link>
      ) : (
        <button
          onClick={disabled ? undefined : onClick}
          disabled={disabled}
          className={buttonClasses}
          title={label}
          ref={ref as React.Ref<HTMLButtonElement>}
          {...(props as React.ButtonHTMLAttributes<HTMLButtonElement>)}
        >
          {buttonContent}
        </button>
      );

    if (!label) {
      return ButtonElement;
    }

    return ButtonElement;
  },
);

CircleControlIcon.displayName = 'CircleControlIcon';
