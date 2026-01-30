import { useStageDeliverables } from '@/hooks/useStageDeliverables';
import { cn } from '@/lib/utils';
import { useMilestonesSidebarViewStore } from '@/stores/milestonesSidebarViewStore';
import { useWorkspaceProjectStore } from '@/stores/workspaceProjectStore';
import { Circle } from 'lucide-react';
import { SimpleTooltip } from '../SimpleTooltip';

export const MilestonesCollapsedView = () => {
  const currentStageId = useWorkspaceProjectStore(
    (state) => state.currentStageId,
  );
  const { toggleMaximize } = useMilestonesSidebarViewStore();
  const { data: milestones = [] } = useStageDeliverables(currentStageId);

  return (
    <div
      className="flex flex-col items-center justify-center w-full py-loop-4 gap-loop-2 cursor-pointer hover:bg-neutral-grayscale-25/50 transition-colors h-full"
      onClick={toggleMaximize}
    >
      {/* Visual indicator that this is a track/timeline */}
      <div className="flex flex-col items-center justify-center gap-loop-3 relative h-full w-full px-loop-4 overflow-y-auto scrollbar-hide">
        {milestones.map((milestone, index) => (
          <div
            key={milestone.id}
            className="relative flex flex-col items-center shrink-0"
          >
            {/* Connector Line */}
            {index < milestones.length - 1 && (
              <div className="absolute top-[20px] bottom-[-16px] w-[1px] border-l border-dashed border-neutral-grayscale-30" />
            )}

            <SimpleTooltip content={milestone.name} side="right">
              <div className="z-10 bg-neutral-grayscale-20">
                <Circle
                  size={12}
                  className={cn(
                    'text-neutral-grayscale-40 transition-colors',
                    milestone.isCompleted &&
                      'fill-neutral-grayscale-40 text-neutral-grayscale-40',
                  )}
                />
              </div>
            </SimpleTooltip>
          </div>
        ))}

        {milestones.length === 0 && (
          <div className="text-neutral-grayscale-40 text-xs text-center mt-4">
            No Milestones
          </div>
        )}
      </div>
    </div>
  );
};
