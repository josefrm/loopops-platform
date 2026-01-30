import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import React from 'react';
import { Link } from 'react-router-dom';
import { SimpleTooltip } from './SimpleTooltip';

// Style configurations for different types
export type ControlIconType = 'default' | 'filter' | 'configuration';

// Dropdown option interface
export interface DropdownOption {
  name: string;
  action: () => void;
  disabled?: boolean;
}

const getTypeStyles = (
  type: ControlIconType,
  disabled: boolean,
  active: boolean,
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
    configuration: {
      normal:
        'bg-neutral-grayscale-0 text-neutral-grayscale-50 border border-neutral-grayscale-40',
      hover:
        'hover:bg-neutral-grayscale-90 hover:border-neutral-grayscale-90 hover:text-white',
      active: 'bg-neutral-grayscale-90 border-neutral-grayscale-90 text-white',
      disabled:
        'bg-neutral-grayscale-40 text-neutral-grayscale-30 border-neutral-grayscale-40',
    },
    filter: {
      normal:
        'bg-neutral-grayscale-0 text-neutral-grayscale-90 border border-neutral-grayscale-90',
      hover:
        'hover:bg-neutral-grayscale-90 hover:border-neutral-grayscale-90 hover:text-white',
      active: 'bg-neutral-grayscale-90 border-neutral-grayscale-90 text-white',
      disabled:
        'bg-neutral-grayscale-40 text-neutral-grayscale-30 border-neutral-grayscale-40',
    },
  };

  const typeStyle = styles[type];

  if (disabled) {
    return typeStyle.disabled;
  }

  return `${typeStyle.normal} ${typeStyle.hover} ${
    active ? typeStyle.active : ''
  }`;
};

interface ControlIconProps {
  icon: React.ReactNode;
  label?: string;
  onClick?: (...args: any[]) => void;
  to?: string;
  disabled?: boolean;
  type?: ControlIconType;
  className?: string;
  active?: boolean; // For future use - currently not affecting styling
  dropdownOptions?: DropdownOption[]; // Optional dropdown options
  dropdownAlign?: 'start' | 'center' | 'end'; // Dropdown alignment
}

export const ControlIcon = React.forwardRef<HTMLDivElement, ControlIconProps>(
  (
    {
      icon,
      label,
      onClick,
      to,
      disabled = false,
      type = 'default',
      className,
      active = false,
      dropdownOptions,
      dropdownAlign = 'start',
    },
    ref,
  ) => {
    const baseClasses =
      'w-loop-12 h-loop-8 rounded-lg flex items-center justify-center transition-all duration-200 cursor-pointer';

    const buttonClasses = cn(
      baseClasses,
      getTypeStyles(type, disabled, active),
      disabled && 'cursor-not-allowed',
      className,
    );

    const buttonContent = <>{icon}</>;

    // If dropdown options are provided, render with dropdown
    if (dropdownOptions && dropdownOptions.length > 0) {
      const content = (
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild disabled={disabled}>
            <button disabled={disabled} className={buttonClasses}>
              {buttonContent}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align={dropdownAlign}
            className="p-loop-4 shadow-lg bg-neutral-grayscale-0 rounded-md border border-neutral-grayscale-20"
            onCloseAutoFocus={(e) => e.preventDefault()}
          >
            {dropdownOptions.map((option, index) => (
              <DropdownMenuItem
                key={index}
                onClick={(e) => {
                  e.preventDefault();
                  if (!option.disabled) {
                    option.action();
                  }
                }}
                disabled={option.disabled}
                className={cn(
                  'p-loop-2 text-md cursor-pointer transition-colors duration-200 text-neutral-grayscale-50 rounded-xs',
                  'hover:bg-neutral-grayscale-10',
                  'focus:bg-neutral-grayscale-10',
                  option.disabled && 'opacity-50 cursor-not-allowed',
                )}
              >
                {option.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      );

      // Conditionally wrap with tooltip only if label exists for dropdown
      if (label) {
        return (
          <SimpleTooltip content={label} side="right">
            <div ref={ref}>{content}</div>
          </SimpleTooltip>
        );
      }

      return <div ref={ref}>{content}</div>;
    }

    // Original behavior for non-dropdown buttons
    const ButtonElement =
      to && !disabled ? (
        <Link to={to} className={buttonClasses}>
          {buttonContent}
        </Link>
      ) : (
        <button
          onClick={disabled ? undefined : onClick}
          disabled={disabled}
          className={buttonClasses}
        >
          {buttonContent}
        </button>
      );

    // Conditionally wrap with tooltip only if label exists
    if (label) {
      return (
        <SimpleTooltip content={label} side="right">
          <div ref={ref}>{ButtonElement}</div>
        </SimpleTooltip>
      );
    }

    return <div ref={ref}>{ButtonElement}</div>;
  },
);

ControlIcon.displayName = 'ControlIcon';
