import React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FileAttachment } from '@/hooks/useDragAndDrop';
import { FileTypeIcon } from '@/components/ui/FileTypeIcon';

interface FileChipProps {
  file: FileAttachment;
  onRemove: (fileId: string) => void;
  showStatus?: boolean;
  className?: string;
}

export const FileChip: React.FC<FileChipProps> = ({
  file,
  onRemove,
  className,
}) => {
  return (
    <div
      className={cn(
        'group relative inline-flex items-center gap-2 px-2 py-2 rounded-[var(--s,16px)] border border-[var(--line/light/light,#dbdbdb)] border-solid',
        'bg-[var(--back/light/main,#ffffff)] transition-all',
        'hover:border-neutral-grayscale-40 hover:shadow-sm',
        className,
      )}
    >
      <FileTypeIcon
        fileName={file.name}
        size={24}
      />

      <p className="font-['Inter'] font-normal text-[14px] leading-normal text-[var(--text/dark/medium,#666666)] whitespace-nowrap">
        {file.name}
      </p>

      <button
        onClick={() => onRemove(file.id)}
        disabled={file.uploadStatus === 'uploading'}
        className={cn(
          'flex-shrink-0 h-5 w-5 rounded-full flex items-center justify-center ml-2',
          'opacity-0 group-hover:opacity-100 transition-opacity',
          'hover:bg-red-100 hover:text-red-600',
          'text-neutral-grayscale-60',
          'disabled:opacity-50 disabled:cursor-not-allowed',
        )}
        title="Remove file"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
};

interface FileChipListProps {
  files: FileAttachment[];
  onRemove: (fileId: string) => void;
  showStatus?: boolean;
  className?: string;
}

export const FileChipList: React.FC<FileChipListProps> = ({
  files,
  onRemove,
  showStatus = true,
  className,
}) => {
  if (files.length === 0) {
    return null;
  }

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {files.map((file) => (
        <FileChip
          key={file.id}
          file={file}
          onRemove={onRemove}
          showStatus={showStatus}
        />
      ))}
    </div>
  );
};
