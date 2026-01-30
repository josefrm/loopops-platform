import { cn } from '@/lib/utils';
import React from 'react';
import { FileTypeIcon } from './FileTypeIcon';

interface FileCardProps {
  fileName: string;
  className?: string;
  onClick?: () => void;
  variant?: 'default' | 'compact';
}

export const FileCard: React.FC<FileCardProps> = ({
  fileName,
  className,
  onClick,
  variant = 'default',
}) => {
  if (variant === 'compact') {
    return (
      <div
        className={cn(
          'inline-flex items-center gap-loop-1 px-loop-2 py-loop-1',
          'bg-neutral-grayscale-5 rounded-[8px]',
          onClick && 'cursor-pointer hover:bg-neutral-grayscale-10',
          className,
        )}
        onClick={onClick}
      >
        <FileTypeIcon fileName={fileName} size={16} />
        <span className="text-loop-12 text-text-dark-medium truncate max-w-[100px]">
          {fileName}
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'bg-neutral-grayscale-0 border border-neutral-grayscale-20 rounded-sm',
        'shadow-[0px_8px_20px_0px_rgba(0,0,0,0.05)]',
        'pl-loop-2 pr-loop-4 py-loop-2',
        'inline-flex gap-loop-1 items-center',
        onClick &&
          'cursor-pointer hover:bg-neutral-grayscale-5 transition-colors',
        className,
      )}
      onClick={onClick}
    >
      <div className="shrink-0 bg-neutral-grayscale-0 rounded-sm w-loop-10 h-loop-10 flex items-center justify-center">
        <FileTypeIcon fileName={fileName} size={24} />
      </div>

      <p className="text-sm leading-normal text-text-dark-medium truncate max-w-[120px]">
        {fileName}
      </p>
    </div>
  );
};
