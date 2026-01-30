import { useSidebarWidth } from '@/contexts/SidebarWidthContext';
import { useSidebarResize } from '@/hooks/useSidebarResize';
import { cn } from '@/lib/utils';
import { useSidebarRightViewStore } from '@/stores/sidebarRightViewStore';
import React, { forwardRef, useCallback } from 'react';
import { ResizeIndicator } from '../ResizeIndicator';
import { SidebarCollapsedView } from './sidebar-right/SidebarCollapsedView';
import { SidebarExpandedView } from './sidebar-right/SidebarExpandedView';
import { SidebarRightProvider } from './sidebar-right/SidebarRightContext';
import { useSidebarSync } from './sidebar-right/hooks/useSidebarSync';
import { useSidebarThreshold } from './sidebar-right/hooks/useSidebarThreshold';

interface LoopOpsSidebarRightProps {
  className?: string;
  mindspaceResizeRef?: React.RefObject<HTMLDivElement>;
  logoRef?: React.RefObject<HTMLDivElement>;
}

export const LoopOpsSidebarRight = forwardRef<
  HTMLDivElement,
  LoopOpsSidebarRightProps
>(({ className, mindspaceResizeRef, logoRef }, ref) => {
  const { setRightSidebarWidth } = useSidebarWidth();
  const { isMaximized: isRightSidebarMaximized, setMaximized } =
    useSidebarRightViewStore();

  const { width, isResizing, handleMouseDown, setWidth } = useSidebarResize({
    side: 'right',
    minWidth: 80,
    maxWidth: 240,
    defaultWidth: 80,
    onWidthChange: setRightSidebarWidth,
  });

  const handleRightSidebarMaximize = useCallback(() => {
    setMaximized(true);
    setWidth(240);
  }, [setMaximized, setWidth]);

  const handleRightSidebarMinimize = useCallback(() => {
    setMaximized(false);
    setWidth(80);
  }, [setMaximized, setWidth]);

  useSidebarSync({
    isMaximized: isRightSidebarMaximized,
    setWidth,
    maxWidth: 240,
    minWidth: 80,
  });

  useSidebarThreshold({
    width,
    isMaximized: isRightSidebarMaximized,
    setMaximized,
    threshold: 150,
  });

  const indicatorWidth = 8;
  const totalSidebarWidth = width + indicatorWidth;

  return (
    <SidebarRightProvider>
      <div
        className="fixed top-0 right-0 h-full z-20 flex flex-row"
        style={{ width: `${totalSidebarWidth}px` }}
        ref={ref}
        data-testid="loopops-sidebar-right"
      >
        <div
          style={{ width: `${indicatorWidth}px`, height: '100%' }}
          data-testid="loopops-sidebar-right-resize"
        >
          <ResizeIndicator
            side="right"
            width={width}
            minWidth={80}
            maxWidth={240}
            isResizing={isResizing}
            onMouseDown={handleMouseDown}
            className="cursor-ew-resize"
          />
        </div>

        <div
          className={cn(
            'h-full bg-white border-neutral-grayscale-20 flex flex-col border-l',
            isResizing && 'select-none',
            isRightSidebarMaximized ? 'p-loop-4' : 'p-loop-4',
            className,
          )}
          style={{ width: `${width}px` }}
          data-testid="loopops-sidebar-right-content"
        >
          {isRightSidebarMaximized ? (
            <SidebarExpandedView
              mindspaceResizeRef={mindspaceResizeRef}
              isMaximized={isRightSidebarMaximized}
              onMaximize={handleRightSidebarMaximize}
              onMinimize={handleRightSidebarMinimize}
              data-testid="sidebar-right-expanded-view"
            />
          ) : (
            <SidebarCollapsedView
              logoRef={logoRef}
              isMaximized={isRightSidebarMaximized}
              onMaximize={handleRightSidebarMaximize}
              onMinimize={handleRightSidebarMinimize}
            />
          )}
        </div>
      </div>
    </SidebarRightProvider>
  );
});

LoopOpsSidebarRight.displayName = 'LoopOpsSidebarRight';
