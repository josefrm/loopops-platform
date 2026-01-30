import { MilestoneTracker } from '@/components/chat/MilestoneTracker';
import { useSidebarWidth } from '@/contexts/SidebarWidthContext';
import { useStageDeliverables } from '@/hooks/useStageDeliverables';
import { cn } from '@/lib/utils';
import { useMilestonesSidebarViewStore } from '@/stores/milestonesSidebarViewStore';
import { useWorkspaceProjectStore } from '@/stores/workspaceProjectStore';
import React from 'react';
import { SizeToggle } from './SizeToggle';
import { MilestonesCollapsedView } from './milestones-sidebar/MilestonesCollapsedView';

interface MilestonesSidebarProps {
  className?: string;
  milestonesResizeRef?: React.RefObject<HTMLDivElement>;
}

export const MilestonesSidebar: React.FC<MilestonesSidebarProps> = ({
  className,
}) => {
  const {
    milestonesSidebarWidth,
    leftSidebarWidth,
    setMilestonesSidebarWidth,
  } = useSidebarWidth();
  const { isMaximized, setMaximized } = useMilestonesSidebarViewStore();

  const currentStageId = useWorkspaceProjectStore(
    (state) => state.currentStageId,
  );
  const currentProject = useWorkspaceProjectStore((state) =>
    state.projects.find((p) => p.id === state.currentProjectId),
  );

  const { data: milestones = [], isLoading } =
    useStageDeliverables(currentStageId);

  // Calculate actual width based on state
  // Ensure that when maximized, we default to at least a reasonable width if the user hasn't resized it yet.
  // If milestonesSidebarWidth is close to 'collapsed' size (80), we should probably bump it up or use a separate state.
  // But strictly following resizing logic: if the user resizes it, that's the width.
  // If useSidebarResize initializes with 'defaultWidth', it should be respected.
  // The issue might be that currentWidth is strictly `isMaximized ? milestonesSidebarWidth : 80`.
  // If `milestonesSidebarWidth` starts at 80 (from context default), maximizing doesn't change it.
  // We need to ensure `milestonesSidebarWidth` is set to something larger when expanding if it's small.

  // Let's use an effect to expand it if it's too small when maximizing
  React.useEffect(() => {
    if (isMaximized && milestonesSidebarWidth <= 80) {
      // Set a default expanded width
      setMilestonesSidebarWidth(240);
    }
  }, [isMaximized, milestonesSidebarWidth, setMilestonesSidebarWidth]);

  const currentWidth = isMaximized ? milestonesSidebarWidth : 80;

  return (
    <div
      className={cn(
        'fixed top-0 bottom-0 z-20 flex flex-col bg-neutral-grayscale-20 p-loop-4',
        className,
      )}
      style={{
        width: `${currentWidth}px`,
        left: `${leftSidebarWidth}px`, // Positioned right next to the left sidebar
      }}
    >
      {/* Content Area */}
      <div className="flex-1 overflow-hidden flex flex-col h-full relative">
        {isMaximized ? (
          <div
            className={cn(
              'flex flex-col h-full w-full transition-opacity duration-200 space-y-loop-4',
            )}
          >
            {/* Header with Toggle */}
            <div className="flex items-center justify-between h-loop-12">
              <p className="text-base leading-normal text-neutral-grayscale-90 text-right tracking-[-0.48px] whitespace-nowrap overflow-hidden text-ellipsis max-w-[150px]">
                {currentProject?.name}
              </p>
              <SizeToggle
                isMaximized={isMaximized}
                onMaximize={() => setMaximized(true)}
                onMinimize={() => setMaximized(false)}
                orientation="horizontal"
                maximizeTitle="Expand Milestones"
                minimizeTitle="Collapse Milestones"
                buttonClassName="bg-neutral-grayscale-0"
                reverse={true}
              />
            </div>
            <h1 className="text-lg text-brand-accent-50">Milestones</h1>
            {/* Scrollable Tracker */}
            <div className="flex-1 overflow-y-auto w-full flex flex-col items-center">
              <div className="w-full">
                <MilestoneTracker milestones={milestones} loading={isLoading} />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-hidden flex flex-col h-full relative items-center justify-center py-4 gap-4">
            {/* Center the Toggle */}
            <div className="shrink-0">
              <SizeToggle
                isMaximized={isMaximized}
                onMaximize={() => setMaximized(true)}
                onMinimize={() => setMaximized(false)}
                orientation="horizontal"
                maximizeTitle="Expand Milestones"
                minimizeTitle="Collapse Milestones"
                buttonClassName="bg-neutral-grayscale-0"
                reverse={true}
              />
            </div>

            {/* Center the Collapsed Content */}
            <div className="flex-1 flex flex-col items-center justify-center w-full min-h-0">
              <MilestonesCollapsedView />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
