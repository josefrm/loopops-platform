import { formatRelativeTime } from '@/helpers/dateHelpers';
import React, { ReactNode } from 'react';
import { ControlButton } from '../ui/ControlButton';
import { InformationTileAction } from '../ui/InformationTile';
import { LoopItemIcon } from '../ui/icons/LoopItemIcon';
import { SessionItem } from './LoopsTabDisplay';

interface LoopItemContentProps {
  data: SessionItem;
  className?: string;
  actions?: InformationTileAction[];
  onClick?: () => void;
  onOpenLoop?: () => void;
  onShowMilestones?: () => void;
  milestonesCount?: number;
  isActive?: boolean;
  icon?: ReactNode;
}

export const LoopItemContent: React.FC<LoopItemContentProps> = ({
  data,
  className = '',
  actions = [],
  onClick,
  onOpenLoop,
  onShowMilestones,
  milestonesCount = 0,
  icon,
}) => {
  const displayDate = data.updated_at || data.created_at;

  return (
    <div
      className={`bg-neutral-grayscale-0 border border-neutral-grayscale-30 rounded-sm p-loop-2 flex items-center gap-loop-6 ${
        onClick
          ? 'cursor-pointer hover:border-brand-accent-60 transition-colors'
          : ''
      } ${className}`}
      onClick={onClick}
    >
      {/* Left section: Icon and content */}
      <div className="flex items-center gap-loop-2 flex-1 min-w-0">
        {/* Loop Icon */}
        <div className="flex-shrink-0">
          {icon || (
            <LoopItemIcon
              fill="var(--brand-accent-50)"
              width={24}
              height={24}
            />
          )}
        </div>

        {/* Content */}
        <div className="flex flex-col gap-loop-1 min-w-0 flex-1">
          <h3 className="text-base font-bold leading-normal text-neutral-grayscale-90 truncate">
            {data.title}
          </h3>
          {data.description && (
            <p className="text-md leading-normal text-neutral-grayscale-90 tracking-[-0.36px] truncate">
              {data.description}
              {' • '}
              {displayDate && (
                <span className="text-sm leading-[13.3px] text-neutral-grayscale-50 tracking-[-0.33px]">
                  {formatRelativeTime(displayDate)}
                </span>
              )}
            </p>
          )}
        </div>
      </div>

      {/* Right section: Chips and actions */}
      <div className="flex items-center gap-loop-4 flex-shrink-0">
        {/* Status chips */}
        <div className="flex items-center gap-loop-1">
          <ControlButton
            text="Open Loop"
            type="white"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onOpenLoop?.();
            }}
            className="h-loop-6 px-loop-2 py-[5px] bg-brand-accent-0"
          />
          {milestonesCount > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onShowMilestones?.();
              }}
              className="bg-brand-accent-50 h-loop-6 w-loop-16 px-loop-2 py-loop-1 rounded-full flex items-center justify-center hover:bg-brand-accent-60 transition-colors"
            >
              <span className="text-xs font-bold leading-normal text-neutral-grayscale-0 tracking-[-0.24px] whitespace-nowrap">
                {milestonesCount} Milestone{milestonesCount !== 1 ? 's' : ''}
              </span>
            </button>
          )}
        </div>

        {/* Action buttons */}
        {actions.length > 0 && (
          <>
            {/* Divider */}
            <div className="w-0 h-[64px] border-r border-neutral-grayscale-30" />
            <div className="flex items-center justify-end">
              {actions.map((action) => (
                <div
                  key={action.id}
                  className={`w-loop-6 h-loop-6 rounded-full bg-neutral-grayscale-0 flex items-center justify-center cursor-pointer hover:bg-neutral-grayscale-10 transition-colors ${
                    action.className || ''
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    action.onClick();
                  }}
                  title={action.label}
                >
                  {action.icon}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
