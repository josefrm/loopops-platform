import { DeleteArtifactModal } from './DeleteArtifactModal';
import { formatRelativeTime } from '@/helpers/dateHelpers';
import { Bookmark, Download, Trash } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { formatFileSize } from '../../utils/fileUtils';
import { Checkbox } from '../ui/checkbox';
import { LoopOpsIcon } from '../ui/icons/LoopOpsIcon';

// Status chip types
export type StatusType =
  | 'uploaded'
  | 'pending'
  | 'processing'
  | 'error'
  | 'fromEditor'
  | 'deliverable'
  | 'completed';

interface StatusChipProps {
  status: StatusType;
  text?: string;
  className?: string;
}

export const StatusChip: React.FC<StatusChipProps> = ({
  status,
  text,
  className = '',
}) => {
  const getStatusConfig = (status: StatusType) => {
    switch (status) {
      case 'uploaded':
        return { bg: 'var(--brand-secondary-50)', text: text || 'Uploaded' };
      case 'deliverable':
        return {
          bg: 'var(--brand-deliverable-20)',
          text: text || 'Key Deliverable',
        };
      case 'completed':
        return { bg: '#D1FAE5', text: text || 'Completed' };
      case 'processing':
        return { bg: '#FEF3C7', text: text || 'Processing' };
      case 'pending':
        return { bg: '#E9ECEF', text: text || 'Pending' };
      case 'fromEditor':
        return {
          bg: 'var(--brand-accent-20)',
          text: text || 'Created',
        };
      default:
        return { bg: '#E9ECEF', text: text || 'Unknown' };
    }
  };

  const config = getStatusConfig(status);

  return (
    <div
      className={`flex h-loop-6 px-[10px] py-[4px] rounded-[12px] w-fit ${className}`}
      style={{
        alignItems: 'flex-start',
        background: config.bg,
      }}
    >
      <span className="text-md text-neutral-grayscale-90">{config.text}</span>
    </div>
  );
};

// Project item content component
interface ArtifactItemContentProps {
  itemId: string | number;
  title: string;
  createdDate?: Date;
  updatedDate?: Date;
  fileSize?: number;
  isDeliverable?: boolean;
  isKeyDeliverable?: boolean;
  onClick?: () => void;
  isActive?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  onDownload?: (id: string, name: string) => void;
  onConvert?: (id: string, name: string, isDeliverable: boolean) => void;
  onToggleKeyDeliverable?: (
    id: string | number,
    currentStatus: boolean,
  ) => void;
  className?: string;
  icon?: React.ReactNode;
}

export const ArtifactItemContent: React.FC<ArtifactItemContentProps> = ({
  itemId,
  title,
  createdDate,
  updatedDate,
  fileSize,
  isKeyDeliverable = false,
  onClick,
  isActive = false,
  onCheckedChange,
  onDownload,
  onConvert,
  onToggleKeyDeliverable,
  className = '',
}) => {
  const activeTileStyles = 'bg-brand-deliverable-0 border-brand-deliverable-50';
  const defaultTileStyles =
    'bg-neutral-grayscale-0 border-neutral-grayscale-30';
  const tileStyles = isActive ? activeTileStyles : defaultTileStyles;
  const dividerColor = 'bg-neutral-grayscale-30';

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Action item interface
  interface ActionItem {
    id: string;
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
    className?: string;
  }

  const handleDeleteConfirm = () => {
    if (onConvert) {
      // Revert convert to deliverable by setting isDeliverable to false
      onConvert(
        typeof itemId === 'string' ? itemId : itemId.toString(),
        title,
        false,
      );
    }
    setIsDeleteModalOpen(false);
  };

  // Generate actions for Deliverable items
  const actions = useMemo<ActionItem[]>(() => {
    const getItemId = () =>
      typeof itemId === 'string' ? itemId : itemId.toString();

    return [
      {
        id: 'download',
        icon: <Download size={16} className="text-neutral-grayscale-60" />,
        label: 'Download',
        onClick: () => {
          if (onDownload) {
            onDownload(getItemId(), title);
          } else {
            console.log('Download item:', title);
          }
        },
      },
      {
        id: 'loop',
        icon: <LoopOpsIcon width={16} height={16} />,
        label: 'Add to loop',
        onClick: () => {
          console.log('Add to loop:', title);
        },
      },
      {
        id: 'trash',
        icon: (
          <Trash
            size={16}
            className="text-neutral-grayscale-50 fill-neutral-grayscale-50"
          />
        ),
        label: 'Remove from loop',
        onClick: () => {
          setIsDeleteModalOpen(true);
        },
      },
    ];
  }, [itemId, title, onDownload]);

  const containerClasses = `
    flex p-loop-4 flex-col items-start gap-loop-2 self-stretch
    rounded-sm border ${tileStyles}
    relative overflow-hidden
    ${
      onClick
        ? 'cursor-pointer hover:border-brand-deliverable-50 transition-colors'
        : ''
    }
    ${className}
  `;

  return (
    <div
      className={containerClasses}
      style={{
        width: '100%',
        minHeight: '64px',
        height: 'auto',
      }}
      onClick={onClick}
    >
      <div className="flex items-start justify-between w-full relative overflow-hidden">
        {/* 1st Column: Leading Content (Checkbox) */}
        <div
          className="flex items-center justify-center flex-shrink-0 self-center"
          onClick={(e) => e.stopPropagation()}
        >
          <Checkbox
            checked={isActive}
            onCheckedChange={(checked) => onCheckedChange?.(checked as boolean)}
            className="h-loop-6 w-loop-6 rounded-full data-[state=checked]:bg-system-success-50 data-[state=checked]:border-system-success-50"
          />
        </div>

        {/* Divider 1 */}
        <div className={`w-px ${dividerColor} mx-loop-4 self-stretch`}></div>

        {/* 2nd Column: Main Content (flexible content area) */}
        <div className="flex items-center gap-loop-4 flex-1 min-w-0">
          {/* Icon */}
          <div
            className="flex items-center justify-center flex-shrink-0 mr-loop-2 self-center cursor-pointer hover:scale-110 transition-transform"
            onClick={(e) => {
              e.stopPropagation();
              onToggleKeyDeliverable?.(itemId, isKeyDeliverable);
            }}
          >
            <Bookmark
              size={24}
              className={
                isKeyDeliverable
                  ? 'text-brand-deliverable-50 fill-brand-deliverable-50'
                  : 'text-neutral-grayscale-30 fill-none hover:text-brand-deliverable-50'
              }
            />
          </div>
          {/* Title and description */}
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-base font-medium text-neutral-grayscale-90 truncate">
              {title}
            </span>
            {(createdDate || updatedDate) && (
              <div className="flex items-center gap-loop-2 text-sm text-neutral-grayscale-50">
                {createdDate && <span>{formatRelativeTime(createdDate)}</span>}
                {createdDate && fileSize && <span>•</span>}
                {fileSize && <span>{formatFileSize(fileSize)}</span>}
              </div>
            )}
          </div>

          {/* Status section - conditional rendering */}
          <div className="flex flex-col gap-loop-2 flex-shrink-0 self-center items-end">
            {isKeyDeliverable && <StatusChip status="deliverable" />}
          </div>
        </div>

        {/* Divider 2 */}
        {actions.length > 0 && (
          <div className={`w-px ${dividerColor} mx-loop-4 self-stretch`}></div>
        )}

        {/* 3rd Column: Actions (customizable actions) */}
        {actions.length > 0 && (
          <div className="flex items-center gap-loop-1 relative z-10 self-center">
            {actions.map((action) => (
              <div
                key={action.id}
                className={`
                  w-loop-8 h-loop-8 rounded-full bg-neutral-grayscale-20
                  flex items-center justify-center cursor-pointer
                  hover:bg-neutral-grayscale-30 transition-colors
                  hover:z-[10000] relative
                  ${action.className || ''}
                `}
                onClick={(e) => {
                  e.stopPropagation();
                  action.onClick();
                }}
                title={action.label}
              >
                {action.icon}
              </div>
            ))}
          </div>
        )}
      </div>
      <DeleteArtifactModal
        open={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
        fileName={title}
        onConfirm={handleDeleteConfirm}
        isDeleting={false}
      />
    </div>
  );
};
