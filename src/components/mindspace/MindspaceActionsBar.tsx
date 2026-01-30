import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MindspaceDocument } from '@/models/MindspaceDocument';
import { MindspaceCategory } from '@/stores/mindspaceStore';
import { Bookmark, DownloadCloud } from 'lucide-react';
import React from 'react';
import { ControlButton } from '../ui/ControlButton';
import { LoopOpsIcon } from '../ui/icons/LoopOpsIcon';
import { TrashIcon2 } from '../ui/icons/TrashIcon';

interface MindspaceActionsBarProps {
  checkedItems: Set<string | number>;
  isEditorOpen: boolean;
  categories: MindspaceCategory[];
  isUpdatingCategory: boolean;
  isBulkDownloading: boolean;
  isBulkDeleting: boolean;
  documents: MindspaceDocument[];
  onCategoryChange: (categoryId: string) => void;
  onStartLoop: (fileIds: (string | number)[]) => void;
  onBulkConvertToDeliverable: (fileIds: string[], fileNames: string[]) => void;
  onBulkDownload: () => void;
  onBulkDelete: () => void;
}

export const MindspaceActionsBar: React.FC<MindspaceActionsBarProps> = ({
  checkedItems,
  isEditorOpen,
  categories,
  isUpdatingCategory,
  isBulkDownloading,
  isBulkDeleting,
  documents,
  onCategoryChange,
  onStartLoop,
  onBulkConvertToDeliverable,
  onBulkDownload,
  onBulkDelete,
}) => {
  return (
    <div
      className={`flex ${
        checkedItems.size > 0 && isEditorOpen
          ? 'flex-col items-start gap-loop-4'
          : 'items-center justify-between gap-loop-2'
      } mb-loop-6 flex-shrink-0`}
    >
      {checkedItems.size > 0 && (
        <>
          {/* Left side: Move to (when files are selected) */}
          <div className="flex items-center gap-loop-2">
            <Select
              value=""
              onValueChange={onCategoryChange}
              disabled={isUpdatingCategory}
            >
              <SelectTrigger className="w-[150px] h-loop-8 text-base bg-neutral-grayscale-0 border border-neutral-grayscale-90 hover:border-neutral-grayscale-30 text-neutral-grayscale-60">
                <SelectValue placeholder="Move to" />
              </SelectTrigger>
              <SelectContent
                showDividers={false}
                chevronClassName="text-neutral-grayscale-50"
                className="w-[var(--radix-select-trigger-width)] min-w-0 p-loop-4 shadow-lg bg-neutral-grayscale-0 rounded-md border border-neutral-grayscale-20"
              >
                {categories
                  .filter((cat) => cat.id !== 1)
                  .map((category) => (
                    <SelectItem
                      key={category.id}
                      value={category.id.toString()}
                      className="text-neutral-grayscale-50 text-sm rounded-xs p-loop-2 cursor-pointer transition-colors duration-200 focus:bg-neutral-grayscale-10 focus:text-neutral-grayscale-90 data-[state=checked]:bg-neutral-grayscale-10 data-[state=checked]:text-neutral-grayscale-90"
                    >
                      {category.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            {isUpdatingCategory && (
              <span className="text-xs text-neutral-grayscale-50">
                Updating...
              </span>
            )}
          </div>

          {/* Right side: Download and Start a Loop (when files are selected) */}
          <div
            className={`flex items-center gap-loop-2 ${
              isEditorOpen ? 'w-full justify-end' : ''
            }`}
          >
            <ControlButton
              type="default"
              size="xl"
              fontSize={11}
              text="Start a Loop"
              icon={<LoopOpsIcon width={16} height={16} />}
              onClick={() => onStartLoop(Array.from(checkedItems))}
              className="!w-loop-32"
            />
            <ControlButton
              type="transparent"
              size="xl"
              fontSize={11}
              icon={<Bookmark width={18} />}
              onClick={() => {
                const selectedFileIds = Array.from(checkedItems).map((id) =>
                  id.toString(),
                );
                const selectedFileNames = documents
                  .filter((doc) => checkedItems.has(doc.id))
                  .map((doc) => doc.fileName);
                onBulkConvertToDeliverable(selectedFileIds, selectedFileNames);
              }}
              text={`(${checkedItems.size})`}
              className={'!w-loop-16'}
            />
            <ControlButton
              type="transparent"
              size="xl"
              fontSize={11}
              text={isBulkDownloading ? '...' : `(${checkedItems.size})`}
              icon={<DownloadCloud width={16} height={16} />}
              onClick={onBulkDownload}
              disabled={isBulkDownloading}
              className={'!w-loop-16'}
            />
            <ControlButton
              type="transparent"
              size="xl"
              fontSize={11}
              icon={<TrashIcon2 width={16} height={16} />}
              onClick={onBulkDelete}
              text={isBulkDeleting ? 'Deleting...' : `(${checkedItems.size})`}
              className={isBulkDeleting ? '!w-loop-32' : '!w-loop-16'}
              disabled={isBulkDeleting}
            />
          </div>
        </>
      )}
    </div>
  );
};
