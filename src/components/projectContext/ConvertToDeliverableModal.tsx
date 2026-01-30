import { ControlButton } from '@/components/ui/ControlButton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
// import { useStageDeliverables } from '@/hooks/useStageDeliverables';
import { ProjectStageService } from '@/services/ProjectStageService';
import { useDeliverablesStore } from '@/stores/deliverablesStore';
import React, { useRef, useState } from 'react';

interface ConvertToDeliverableModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Single file props (backward compatible)
  fileName?: string;
  itemId?: string;
  // Bulk file props
  fileNames?: string[];
  itemIds?: string[];
  isDeliverable?: boolean;
  onSuccess?: (itemId?: string, newIsDeliverable?: boolean) => void;
}

export const ConvertToDeliverableModal: React.FC<
  ConvertToDeliverableModalProps
> = ({
  open,
  onOpenChange,
  fileName,
  itemId,
  fileNames,
  itemIds,
  isDeliverable = false,
  onSuccess,
}) => {
  // const [selectedDeliverable, setSelectedDeliverable] = useState<string>('');
  const [isConverting, setIsConverting] = useState(false);
  const { toast } = useToast();

  // Get toggle function from deliverables store
  const toggleDeliverableStatus = useDeliverablesStore(
    (state) => state.toggleDeliverableStatus,
  );

  // Debounce ref to prevent double clicks
  const lastClickTimeRef = useRef<number>(0);
  const DEBOUNCE_MS = 500;

  // Determine if this is a bulk operation
  const isBulkOperation = itemIds && itemIds.length > 1;
  const fileCount = isBulkOperation ? itemIds.length : itemId ? 1 : 0;

  // Get display text for file(s)
  const getFileDisplayText = () => {
    if (isBulkOperation && fileNames && fileNames.length > 0) {
      if (fileNames.length <= 3) {
        return fileNames.map((name) => `"${name}"`).join(', ');
      }
      return `${fileNames
        .slice(0, 2)
        .map((name) => `"${name}"`)
        .join(', ')} and ${fileNames.length - 2} more`;
    }
    return fileName ? `"${fileName}"` : '';
  };

  // Get deliverables for the current stage
  // const { data: deliverables = [], isLoading: deliverablesLoading } =
  //   useStageDeliverables(stageId);

  const handleToggleDeliverable = async () => {
    // Debounce check
    const now = Date.now();
    if (now - lastClickTimeRef.current < DEBOUNCE_MS) {
      return;
    }
    lastClickTimeRef.current = now;

    const effectiveItemIds = isBulkOperation ? itemIds : itemId ? [itemId] : [];

    if (effectiveItemIds.length === 0) {
      toast({
        title: 'Missing information',
        description: 'Please ensure all required data is available.',
        variant: 'destructive',
      });
      return;
    }

    setIsConverting(true);
    try {
      if (isBulkOperation) {
        // Bulk operation - call service with all IDs
        const response = await ProjectStageService.toggleDeliverable(
          undefined,
          effectiveItemIds,
        );

        if (!response.success && !response.updatedFiles) {
          throw new Error(
            response.error || 'Failed to toggle deliverable status',
          );
        }

        // Count successes from response
        const updatedFiles = response.updatedFiles || {};
        const successCount = Object.keys(updatedFiles).length;

        if (successCount === effectiveItemIds.length) {
          toast({
            title: 'Files updated successfully',
            description: `All ${successCount} file(s) have been updated.`,
          });
        } else if (successCount > 0) {
          toast({
            title: 'Some files updated',
            description: `${successCount} of ${effectiveItemIds.length} file(s) were updated.`,
            variant: 'default',
          });
        } else {
          toast({
            title: 'Update failed',
            description: 'No files were updated. Please try again.',
            variant: 'destructive',
          });
        }

        // Update store for each successfully updated file
        Object.entries(updatedFiles).forEach(([id, newStatus]) => {
          if (!newStatus) {
            // File was removed from deliverables
            useDeliverablesStore.getState().removeItem(id);
          } else {
            // File was added to deliverables
            useDeliverablesStore.getState().updateItem(id, {
              isDeliverable: newStatus,
            });
          }
        });

        // Call success callback for bulk operations too
        onSuccess?.();
      } else {
        // Single file operation - use store's toggle function
        const { success, newStatus } = await toggleDeliverableStatus(
          effectiveItemIds[0],
        );

        if (!success) {
          throw new Error('Failed to toggle deliverable status');
        }

        toast({
          title: newStatus
            ? 'Added to Deliverables'
            : 'Removed from Deliverables',
          description: newStatus
            ? `"${fileName}" has been added to deliverables.`
            : `"${fileName}" has been removed from deliverables.`,
        });

        // Call success callback to update UI with new state
        onSuccess?.(effectiveItemIds[0], newStatus);
      }

      // setSelectedDeliverable('');
      onOpenChange(false);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Failed to update deliverable status. Please try again.';
      console.error('[ConvertToDeliverableModal] Error:', errorMessage, error);
      toast({
        title: 'Action failed',
        description: errorMessage,
        variant: 'destructive',
        duration: 10000,
      });
    } finally {
      setIsConverting(false);
    }
  };

  const handleCancel = () => {
    // setSelectedDeliverable('');
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        // Prevent closing while converting
        if (!isOpen && isConverting) {
          return;
        }
        if (!isOpen) {
          // setSelectedDeliverable('');
        }
        onOpenChange(isOpen);
      }}
    >
      <DialogContent
        className="sm:max-w-[441px] p-loop-8"
        onInteractOutside={(e) => {
          if (isConverting) {
            e.preventDefault();
          }
        }}
        onEscapeKeyDown={(e) => {
          if (isConverting) {
            e.preventDefault();
          }
        }}
      >
        <DialogHeader className="relative">
          <DialogTitle className="text-xl font-bold text-gray-900 pr-8">
            {isBulkOperation
              ? isDeliverable
                ? `Remove ${fileCount} files from Deliverables`
                : `Add ${fileCount} files to Deliverables`
              : isDeliverable
              ? 'Remove from Deliverables'
              : 'Add to Deliverables'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-loop-4">
          <p className="text-base font-normal">
            {isDeliverable ? (
              <>
                You're about to remove{' '}
                <span className="text-brand-accent-50">
                  {getFileDisplayText()}
                </span>{' '}
                from Deliverables.{' '}
                {isBulkOperation ? 'These items' : 'This item'} will no longer
                appear in your deliverables list.
              </>
            ) : (
              <>
                You're about to add{' '}
                <span className="text-brand-accent-50">
                  {getFileDisplayText()}
                </span>{' '}
                to Deliverables. This will mark{' '}
                {isBulkOperation ? 'them' : 'it'} as key{' '}
                {isBulkOperation ? 'outputs' : 'output'} for your project.
              </>
            )}
          </p>

          {/* Deliverable Selection */}
          {/* <Select
            value={selectedDeliverable}
            onValueChange={setSelectedDeliverable}
            disabled={deliverablesLoading || isConverting}
          >
            <SelectTrigger className="w-full h-loop-10">
              <SelectValue
                placeholder={
                  deliverablesLoading
                    ? 'Loading deliverables...'
                    : 'Select Deliverable'
                }
                className="text-base"
              />
            </SelectTrigger>
            <SelectContent
              showDividers={false}
              chevronClassName="text-neutral-grayscale-50"
              className="max-h-[300px] w-[var(--radix-select-trigger-width)] min-w-0 p-loop-4 shadow-lg bg-neutral-grayscale-0 rounded-md border border-neutral-grayscale-20"
            >
              {deliverables.map((deliverable) => (
                <SelectItem
                  key={deliverable.id}
                  value={deliverable.id}
                  className="p-loop-2 text-md cursor-pointer transition-colors duration-200 text-neutral-grayscale-50 rounded-xs focus:bg-neutral-grayscale-10 focus:text-neutral-grayscale-90 data-[state=checked]:bg-neutral-grayscale-10 data-[state=checked]:text-neutral-grayscale-90"
                >
                  {deliverable.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select> */}

          {/* Confirmation Text */}
          <p className="!mt-loop-6 text-base">
            <span className="font-bold text-gray-900">Are you sure?</span>
          </p>

          {/* Action Buttons */}
          <div className="flex justify-between">
            <ControlButton
              type="transparent_brand"
              size="lg"
              text="Cancel"
              onClick={handleCancel}
              className="!w-[160px]"
              disabled={isConverting}
            />
            <ControlButton
              type="default"
              size="lg"
              text={
                isConverting
                  ? isDeliverable
                    ? 'Removing...'
                    : 'Adding...'
                  : isBulkOperation
                  ? isDeliverable
                    ? `Remove ${fileCount} files`
                    : `Add ${fileCount} files`
                  : isDeliverable
                  ? 'Remove from Deliverables'
                  : 'Add to Deliverables'
              }
              onClick={handleToggleDeliverable}
              className="!w-[204px]"
              disabled={isConverting}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
