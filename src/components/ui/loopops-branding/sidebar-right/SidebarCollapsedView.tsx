import { useFileDrag } from '@/hooks/useFileDrag';
import React from 'react';
import { FileTypeIcon } from '../../FileTypeIcon';
import { SimpleTooltip } from '../../SimpleTooltip';
import { SizeToggle } from '../../SizeToggle';
import { useSidebarRightContext } from './SidebarRightContext';

interface SidebarCollapsedViewProps {
  logoRef?: React.RefObject<HTMLDivElement>;
  isMaximized: boolean;
  onMaximize: () => void;
  onMinimize: () => void;
}

const DraggableFileIcon = ({
  doc,
}: {
  doc: {
    id: string;
    fileName: string;
    signedUrl?: string;
    mimeType?: string;
    fileSize?: string;
  };
}) => {
  const { isDragging, handleDragStart, handleDragEnd } = useFileDrag({
    fileData: {
      id: doc.id,
      fileName: doc.fileName,
      signedUrl: doc.signedUrl,
      mimeType: doc.mimeType,
      fileSize: doc.fileSize,
    },
    fileName: doc.fileName,
  });

  return (
    <SimpleTooltip content={doc.fileName} side="left">
      <div
        draggable
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        className={`max-h-[60px] bg-neutral-grayscale-0 border border-neutral-grayscale-30 rounded-sm w-full aspect-square flex items-center justify-center hover:bg-neutral-grayscale-5 transition-colors cursor-grab shrink-0 ${
          isDragging ? 'opacity-50' : ''
        }`}
      >
        <FileTypeIcon fileName={doc.fileName} size={20} />
      </div>
    </SimpleTooltip>
  );
};

export const SidebarCollapsedView: React.FC<SidebarCollapsedViewProps> = ({
  logoRef,
  isMaximized,
  onMaximize,
  onMinimize,
}) => {
  const { documents } = useSidebarRightContext();

  return (
    <div className="h-full flex flex-col space-y-loop-4">
      <SizeToggle
        ref={logoRef}
        isMaximized={isMaximized}
        onMaximize={onMaximize}
        onMinimize={onMinimize}
        className="h-loop-12 justify-center"
        orientation="horizontal"
        reverse={false}
      />

      <div className="w-loop-12 h-[1px] bg-neutral-grayscale-30" />

      <div className="flex-1 min-h-0 flex flex-col relative w-full">
        <div className="flex flex-col items-center space-y-loop-5 overflow-y-auto scrollbar-hide pb-loop-4 h-full">
          <div className="flex flex-col gap-loop-2 w-full">
            {documents.map((doc) => (
              <DraggableFileIcon key={doc.id} doc={doc} />
            ))}
          </div>
        </div>

        {/* Fade gradient indicator for overflow content */}
        {documents.length > 4 && (
          <div
            className="absolute bottom-0 left-0 right-0 h-8 pointer-events-none"
            style={{
              background: `linear-gradient(to top, var(--neutral-grayscale-0), rgba(255, 255, 255, 0.8), transparent)`,
            }}
          />
        )}
      </div>
    </div>
  );
};
