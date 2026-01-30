import { useFileDrag } from '@/hooks/useFileDrag';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { GripVertical } from 'lucide-react';
import React from 'react';
import { FileCard } from '../FileCard';
import { FileTypeIcon } from '../FileTypeIcon';

interface MindspaceFileCardProps {
  fileName: string;
  createdAt?: string;
  className?: string;
  onClick?: () => void;
  fileData?: {
    id: string;
    signedUrl?: string;
    mimeType?: string;
    fileSize?: string;
  };
  variant?: 'sidebar' | 'chat';
}

export const MindspaceFileCard: React.FC<MindspaceFileCardProps> = ({
  fileName,
  createdAt,
  className,
  onClick,
  fileData,
  variant = 'sidebar',
}) => {
  const { isDragging, handleDragStart, handleDragEnd } = useFileDrag({
    fileData: fileData ? { ...fileData, fileName } : undefined,
    fileName,
  });

  const formatTimestamp = (dateString?: string): string => {
    if (!dateString) return 'Recently';

    try {
      const date = new Date(dateString);
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Recently';
    }
  };

  if (variant === 'chat') {
    return (
      <div
        draggable={!!fileData}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        className={cn(isDragging && 'opacity-50', className)}
      >
        <FileCard fileName={fileName} onClick={onClick} variant="default" />
      </div>
    );
  }

  return (
    <div
      draggable={!!fileData}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={cn(
        'bg-neutral-grayscale-0 border border-neutral-grayscale-30 rounded-sm',
        'pl-loop-2 pr-loop-3 py-loop-3',
        'flex gap-loop-2 items-center',
        'cursor-pointer hover:bg-neutral-grayscale-5 transition-colors',
        fileData && 'cursor-move',
        isDragging && 'opacity-50',
        className,
      )}
      onClick={onClick}
    >
      <div className="shrink-0">
        <GripVertical size={16} className="text-neutral-grayscale-30" />
      </div>

      <div className="h-loop-6 w-0 border-r border-neutral-grayscale-30" />

      <div className="shrink-0">
        <FileTypeIcon fileName={fileName} size={16} />
      </div>

      <div className="flex-1 min-w-0 flex flex-col gap-loop-1">
        <p className="text-md leading-normal text-neutral-grayscale-50 tracking-[-0.36px] truncate">
          {fileName}
        </p>
        <p className="text-sm leading-[13.3px] text-neutral-grayscale-40 tracking-[-0.33px]">
          {formatTimestamp(createdAt)}
        </p>
      </div>
    </div>
  );
};
