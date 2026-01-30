import React from 'react';
import { SizeToggle } from '../../SizeToggle';
import { SidebarFileList } from './SidebarFileList';

interface SidebarExpandedViewProps {
  mindspaceResizeRef?: React.RefObject<HTMLDivElement>;
  isMaximized: boolean;
  onMaximize: () => void;
  onMinimize: () => void;
}

export const SidebarExpandedView: React.FC<SidebarExpandedViewProps> = ({
  mindspaceResizeRef,
  isMaximized,
  onMaximize,
  onMinimize,
}) => {
  return (
    <div className="flex flex-col gap-loop-6 h-full">
      <div className="flex items-center justify-between h-loop-8">
        <p className="font-bold text-loop-16 leading-normal text-neutral-grayscale-90 text-right tracking-[-0.48px]">
          Recent Files
        </p>
        <SizeToggle
          ref={mindspaceResizeRef}
          isMaximized={isMaximized}
          onMaximize={onMaximize}
          onMinimize={onMinimize}
          maximizeTitle="Maximize right sidebar"
          minimizeTitle="Minimize right sidebar"
          orientation="horizontal"
        />
      </div>

      <div className="flex-1 min-h-0 flex flex-col">
        <SidebarFileList />
      </div>
    </div>
  );
};
