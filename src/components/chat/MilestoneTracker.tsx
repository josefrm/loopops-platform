import React from 'react';
import { Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MilestoneItem } from '@/models/Deliverable';
import { formatRelativeTime } from '@/helpers/dateHelpers';

interface MilestoneTrackerProps {
  milestones: MilestoneItem[];
  loading?: boolean;
  className?: string;
}

export const MilestoneTracker: React.FC<MilestoneTrackerProps> = ({
  milestones,
  loading = false,
  className = '',
}) => {
  if (loading) {
    return (
      <div className={cn('space-y-4', className)}>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-neutral-grayscale-60">
            Loading milestones...
          </span>
        </div>
      </div>
    );
  }

  if (milestones.length === 0) {
    return (
      <div className={cn('text-center py-8', className)}>
        <p className="text-sm text-neutral-grayscale-60">
          No milestones found for this stage
        </p>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col gap-0', className)}>
      {milestones.map((milestone, index) => (
        <div
          key={milestone.id}
          className="self-stretch px-2 py-4 flex flex-col justify-start items-start gap-2.5 relative"
        >
          {index < milestones.length - 1 && (
            <div 
              className="absolute left-[14px] top-[28px] bottom-0 w-[1px] border-l border-dashed border-neutral-grayscale-30"
            />
          )}

          <div className="w-full flex justify-start items-center gap-2 relative z-10">
            <div className="w-3 h-3 flex-shrink-0 relative">
              <Circle 
                size={12} 
                className={cn(
                  "text-neutral-grayscale-40",
                  milestone.isCompleted && "fill-neutral-grayscale-40"
                )}
              />
            </div>

            <div className="flex-1 flex flex-col justify-start items-start">
              <div className="self-stretch text-neutral-grayscale-50 text-[12px] font-normal font-['Inter'] leading-[normal] tracking-[-0.36px]">
                {milestone.name}
              </div>
              <div className="self-stretch text-neutral-grayscale-40 text-[11px] font-normal font-['Inter'] leading-[13.3px] tracking-[-0.33px]">
                {milestone.updatedAt ? formatRelativeTime(new Date(milestone.updatedAt)) : 'Recently'}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
