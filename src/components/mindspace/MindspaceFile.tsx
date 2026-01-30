import { MindspaceDocument } from '@/models/MindspaceDocument';
import { Download, EllipsisIcon, Equal } from 'lucide-react';
import React from 'react';
import { CircleControlIcon } from '../ui/CircleControlIcon';
import { FileTypeIcon } from '../ui/FileTypeIcon';
import { AddTaskIcon } from '../ui/icons/AddTaskIcon';
import { LoopOpsIcon } from '../ui/icons/LoopOpsIcon';

interface MindspaceFileProps {
  document?: MindspaceDocument;
  fileName?: string; // Keep for backward compatibility
  fileType?: string; // Keep for backward compatibility
  onDelete?: (id: string) => void;
}

export const MindspaceFile: React.FC<MindspaceFileProps> = ({
  document,
  fileName,
}) => {
  // Use document data if available, otherwise fall back to props
  const displayFileName = document?.fileName || fileName || 'Unknown file';

  const isUploaded = document?.isUploaded || false;

  // Get status chip
  const getStatusChip = () => {
    // For mock/existing files (no document object), show "Uploaded"
    if (!document) {
      return (
        <div
          className="flex h-loop-6 px-[10px] py-[4px] rounded-[12px] max-w-[100px] w-fit"
          style={{
            alignItems: 'flex-start',
            background: 'var(--brand-secondary-50)', // Blue for uploaded
          }}
        >
          <span className="text-md text-neutral-grayscale-90">Uploaded</span>
        </div>
      );
    }

    // For document objects, check their upload status
    if (isUploaded) {
      return (
        <div
          className="flex h-loop-6 px-[10px] py-[4px] rounded-[12px] max-w-[100px] w-fit"
          style={{
            alignItems: 'flex-start',
            background: 'var(--brand-secondary-50)', // Blue for uploaded
          }}
        >
          <span className="text-md text-neutral-grayscale-90">Uploaded</span>
        </div>
      );
    }

    // Show pending chip for documents that haven't been uploaded yet
    return (
      <div
        className="flex h-loop-6 px-[10px] py-[4px] rounded-[12px] max-w-[100px] w-fit"
        style={{
          alignItems: 'flex-start',
          background: '#E9ECEF', // Gray for pending
        }}
      >
        <span className="text-md text-neutral-grayscale-90">Pending</span>
      </div>
    );
  };
  return (
    <div
      className="flex p-loop-4 flex-col items-start gap-loop-2 self-stretch rounded-sm border bg-white border-neutral-grayscale-30 relative overflow-visible"
      style={{
        width: '810px',
        height: '64px',
      }}
    >
      <div className="flex items-center justify-between w-full h-full relative overflow-visible">
        {/* 1st Column: File Icon */}
        <div className="flex items-center justify-center flex-shrink-0">
          <Equal size={24} className="text-neutral-grayscale-30" />
        </div>

        {/* Divider 1 */}
        <div className="w-px h-6 bg-neutral-grayscale-30 mx-loop-4"></div>

        {/* 2nd Column: File Info with 3 sub-columns */}
        <div className="flex items-center flex-1 gap-loop-3">
          {/* Sub-column 1: File type icon */}
          <div className="flex items-center justify-center flex-shrink-0">
            <FileTypeIcon fileName={displayFileName} size={20} />
          </div>

          {/* Sub-column 2: File name and size (2 rows) */}
          <div className="flex flex-col flex-1 min-w-0">
            <span className="text-base font-medium text-neutral-grayscale-90 truncate">
              {displayFileName}
            </span>
            <span className="text-sm text-neutral-grayscale-50">
              {document?.fileSize || 'Unknown size'}
            </span>
          </div>

          {/* Sub-column 3: Status chip aligned right */}
          <div className="flex justify-end flex-shrink-0">
            {getStatusChip()}
          </div>
        </div>

        {/* Divider 2 */}
        <div className="w-px h-6 bg-neutral-grayscale-30 mx-loop-4"></div>

        {/* 3rd Column: Actions (4 CircleControlIcon) */}
        <div className="flex items-center gap-loop-1 relative z-10">
          <CircleControlIcon
            type="gray"
            size="sm"
            icon={<AddTaskIcon />}
            onClick={() => console.log('Add Task:', displayFileName)}
            className="hover:z-[10000] relative"
          />
          <CircleControlIcon
            type="gray"
            size="sm"
            icon={<Download />}
            label="Download file"
            onClick={() => console.log('Download file:', displayFileName)}
            className="hover:z-[10000] relative"
          />
          <CircleControlIcon
            type="gray"
            size="sm"
            icon={<LoopOpsIcon />}
            label="Share file"
            onClick={() => console.log('Share file:', displayFileName)}
            className="hover:z-[10000] relative"
          />
          <CircleControlIcon
            type="gray"
            size="sm"
            icon={<EllipsisIcon />}
            label="More options"
            onClick={() => console.log('More options:', displayFileName)}
            className="hover:z-[10000] relative"
          />
        </div>
      </div>
    </div>
  );
};
