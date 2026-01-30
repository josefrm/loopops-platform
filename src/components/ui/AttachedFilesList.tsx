import React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FileAttachment } from '@/hooks/useDragAndDrop';
import { FileCard } from '@/components/ui/FileCard';

interface AttachedFilesListProps {
  files: FileAttachment[];
  onRemoveFile: (fileId: string) => void;
  className?: string;
}

export const AttachedFilesList: React.FC<AttachedFilesListProps> = ({
  files,
  onRemoveFile,
  className,
}) => {
  if (files.length === 0) return null;

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {files.map((file) => (
        <div
          key={file.id}
          className="relative group"
        >
          <button
            onClick={() => onRemoveFile(file.id)}
            className="absolute -top-1 -right-1 z-20 h-5 w-5 rounded-full bg-neutral-grayscale-90 hover:bg-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="h-3 w-3 text-white" />
          </button>

          <FileCard
            fileName={file.name}
            mimeType={file.type}
            variant="default"
          />
        </div>
      ))}
    </div>
  );
};
