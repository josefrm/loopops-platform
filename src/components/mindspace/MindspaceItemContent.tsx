import { formatRelativeTime } from '@/helpers/dateHelpers';
import { useCurrentStage } from '@/hooks/useCurrentStage';
import { useFileTransfer } from '@/hooks/useFileTransfer';
import { Bookmark, Download, Trash2 } from 'lucide-react';
import React from 'react';
import { StatusChip, StatusType } from '../projectContext/ArtifactItemContent';
import { CircleControlIcon } from '../ui/CircleControlIcon';
import { FileTypeIcon } from '../ui/FileTypeIcon';
import { Checkbox } from '../ui/checkbox';
import { LoopOpsIcon } from '../ui/icons/LoopOpsIcon';

interface MindspaceItemContentProps {
  fileName: string;
  fileSize?: string;
  status?: StatusType;
  uploadProgress?: number;
  createdInEditor?: boolean;
  createdDate?: Date;
  signedUrl?: string;
  isSelected?: boolean;
  isFocused?: boolean;
  belongsToStage?: boolean;
  isDeliverable?: boolean;
  fileId?: string;
  mimeType?: string;
  onSelect?: (selected: boolean) => void;
  onDownload?: () => void;
  onConvertToDeliverable?: () => void;
  startLoop?: () => void;
  onDelete?: () => void;
  onClick?: () => void;
  isCompact?: boolean;
}

export const MindspaceItemContent: React.FC<MindspaceItemContentProps> = ({
  fileName,
  fileSize,
  status = 'uploaded',
  uploadProgress,
  createdInEditor = false,
  createdDate,
  signedUrl,
  isSelected = false,
  isFocused = false,
  belongsToStage = false,
  isDeliverable = false,
  fileId,
  mimeType,
  onSelect,
  onDownload,
  onConvertToDeliverable,
  startLoop,
  onDelete,
  onClick,
  isCompact = false,
}) => {
  const { transferFilesToChat } = useFileTransfer();
  const { currentStagePriority } = useCurrentStage();

  const handleDownload = () => {
    if (onDownload) {
      onDownload();
    } else if (signedUrl) {
      window.open(signedUrl, '_blank');
    }
  };

  const handleStartLoop = async () => {
    if (startLoop) {
      startLoop();
      return;
    }

    if (!signedUrl || !fileId) {
      return;
    }

    await transferFilesToChat(
      {
        id: fileId,
        fileName,
        signedUrl,
        mimeType,
      },
      {
        createNewSession: true,
        stageId: currentStagePriority,
      },
    );
  };

  return (
    <div
      className={`
        flex p-loop-4 items-center gap-loop-4 self-stretch
        rounded-sm border transition-colors
        ${
          isSelected
            ? 'bg-brand-file-0 border-brand-file-50'
            : isFocused
            ? 'bg-brand-accent-0 border-brand-accent-50 shadow-sm'
            : 'bg-neutral-grayscale-0 border-neutral-grayscale-30 hover:border-brand-file-50'
        }
      `}
    >
      {/* Checkbox */}
      <div className="flex items-center justify-center flex-shrink-0">
        <Checkbox
          checked={isSelected}
          onCheckedChange={(checked) => onSelect?.(checked as boolean)}
          onClick={(e) => e.stopPropagation()}
          className="h-loop-6 w-loop-6 rounded-full data-[state=checked]:bg-system-success-50 data-[state=checked]:border-system-success-50"
        />
      </div>

      {/* Clickable Content Area - from divider to status chip */}
      <div
        className="flex items-center gap-loop-4 flex-1 min-w-0 cursor-pointer"
        onClick={onClick}
      >
        {/* Divider */}
        <div className="w-px bg-neutral-grayscale-30 self-stretch" />

        {/* File Icon */}
        <div className="flex items-center justify-center flex-shrink-0">
          <FileTypeIcon fileName={fileName} size={32} />
        </div>

        {/* File Info */}
        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-base font-medium text-neutral-grayscale-90 truncate">
            {fileName}
          </span>
          <div
            className={`hidden ${
              isCompact ? '' : 'xl:flex'
            } items-center gap-loop-2 text-sm text-neutral-grayscale-50`}
          >
            <span>{fileSize || 'Unknown size'}</span>
            {createdDate && (
              <>
                <span>•</span>
                <span>{formatRelativeTime(createdDate)}</span>
              </>
            )}
          </div>
          {/* Upload Progress Bar - hide when upload completes (>= 100) */}
          {uploadProgress !== undefined &&
            uploadProgress > 0 &&
            uploadProgress < 100 && (
              <div className="w-full bg-neutral-grayscale-20 rounded-full h-1 mt-loop-1">
                <div
                  className="bg-brand-accent-50 h-1 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            )}
        </div>

        {/* Status */}
        <div className="flex items-center flex-shrink-0">
          <StatusChip status={createdInEditor ? 'fromEditor' : status} />
        </div>
      </div>

      {/* Divider */}
      <div className="w-px bg-neutral-grayscale-30 self-stretch" />

      {/* Actions */}
      <div className="flex items-center gap-loop-2 flex-shrink-0">
        {onConvertToDeliverable && (
          <>
            {isDeliverable ? (
              <span className="text-sm text-system-success-50 font-medium w-auto whitespace-nowrap">
                Artifact
              </span>
            ) : belongsToStage ? (
              <span className="text-sm text-system-success-50 font-medium w-loop-24 ">
                In Artifacts
              </span>
            ) : (
              <span className="w-loop-20"></span>
            )}

            <CircleControlIcon
              type="gray"
              icon={<Bookmark width={24} />}
              onClick={() => {
                onConvertToDeliverable?.();
              }}
              active={belongsToStage || isDeliverable}
              size="xs"
            />
          </>
        )}
        <>
          <CircleControlIcon
            type="gray"
            icon={<Download size={24} />}
            label="Download"
            onClick={() => {
              handleDownload();
            }}
            size="xs"
          />
          <CircleControlIcon
            type="gray"
            icon={<LoopOpsIcon width={16} />}
            label="Start Loop"
            onClick={handleStartLoop}
            size="xs"
          />
          <CircleControlIcon
            type="gray"
            icon={<Trash2 size={24} fill="currentColor" />}
            label="Delete"
            onClick={() => {
              onDelete?.();
            }}
            size="xs"
          />
        </>
      </div>
    </div>
  );
};
