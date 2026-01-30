import { ControlButton } from '@/components/ui/ControlButton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ProjectStageService } from '@/services/ProjectStageService';
import { useStagesStore } from '@/stores/stagesStore';
import { useWorkspaceProjectStore } from '@/stores/workspaceProjectStore';
import React, { useState } from 'react';
import { ProcessingFilesOverlay } from '../ui/ProcessingFilesOverlay';

interface ConvertToDeliverableStageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Single file props (backward compatible)
  fileName?: string;
  mindspaceFileId?: string;
  // Bulk file props
  fileNames?: string[];
  mindspaceFileIds?: string[];
  onSuccess?: () => void;
}

export const ConvertToDeliverableStageModal: React.FC<
  ConvertToDeliverableStageModalProps
> = ({
  open,
  onOpenChange,
  fileName,
  mindspaceFileId,
  fileNames,
  mindspaceFileIds,
  onSuccess,
}) => {
  const [selectedStage, setSelectedStage] = useState<string>('');
  const [isCopying, setIsCopying] = useState(false);
  const { stages, loading } = useStagesStore();
  const selectedProject = useWorkspaceProjectStore((state) =>
    state.getCurrentProject(),
  );
  const { toast } = useToast();

  // Use project from store
  const project = selectedProject;

  // Determine if this is a bulk operation
  const isBulkOperation = mindspaceFileIds && mindspaceFileIds.length > 1;
  const fileCount = isBulkOperation
    ? mindspaceFileIds.length
    : mindspaceFileId
    ? 1
    : 0;

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

  const handleCopyToStage = async () => {
    const effectiveFileIds = isBulkOperation
      ? mindspaceFileIds
      : mindspaceFileId
      ? [mindspaceFileId]
      : [];

    if (!selectedStage || effectiveFileIds.length === 0 || !project?.id) {
      toast({
        title: 'Missing information',
        description:
          'Please select a stage and ensure all required data is available.',
        variant: 'destructive',
      });
      return;
    }

    // Find the selected stage to get its project_stage_id
    const stage = stages.find((s) => s.id.toString() === selectedStage);
    if (!stage?.project_stage_id) {
      toast({
        title: 'Invalid stage',
        description: 'The selected stage is not valid.',
        variant: 'destructive',
      });
      return;
    }

    setIsCopying(true);
    try {
      if (isBulkOperation) {
        // Bulk operation
        const response = await ProjectStageService.bulkCopyMindspaceToStage(
          effectiveFileIds,
          stage.project_stage_id,
        );

        if (response.summary.succeeded === response.summary.total) {
          toast({
            title: 'Files converted successfully',
            description: `All ${response.summary.succeeded} file(s) have been converted to artifacts.`,
          });
        } else if (response.summary.succeeded > 0) {
          toast({
            title: 'Some files converted',
            description: `${response.summary.succeeded} of ${response.summary.total} file(s) were converted. ${response.summary.failed} failed.`,
            variant: 'default',
          });
        } else {
          toast({
            title: 'Conversion failed',
            description: 'No files were converted. Please try again.',
            variant: 'destructive',
          });
        }
      } else {
        // Single file operation
        const response = await ProjectStageService.copyMindspaceToStage(
          effectiveFileIds[0],
          stage.project_stage_id,
        );

        toast({
          title: 'File converted successfully',
          description:
            response.message || 'The file has been converted to an artifact.',
        });
      }

      // Call success callback to update UI
      onSuccess?.();
      setSelectedStage('');
      onOpenChange(false);
    } catch (error) {
      console.error('Error converting file(s) to artifact:', error);
      toast({
        title: 'Conversion failed',
        description:
          error instanceof Error
            ? error.message
            : 'Failed to convert the file(s). Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsCopying(false);
    }
  };

  const handleCancel = () => {
    setSelectedStage('');
    onOpenChange(false);
  };

  // Prepare backing data for overlay
  const processingDocs = (() => {
    if (!isCopying) return [];

    if (isBulkOperation && fileNames) {
      // If we have file names, map them
      return fileNames.map((name, i) => ({
        id: `copy-${i}`,
        fileName: name,
        uploadProgress: 80, // indeterminate/busy state
      }));
    } else if (fileName) {
      return [
        {
          id: 'copy-single',
          fileName: fileName,
          uploadProgress: 80,
        },
      ];
    }

    // Fallback if no names available
    return [
      {
        id: 'copy-generic',
        fileName: isBulkOperation
          ? `Converting ${fileCount} files...`
          : 'Converting file...',
        uploadProgress: 100,
      },
    ];
  })();

  const getTargetStageName = () => {
    return stages.find((stage) => stage.id.toString() === selectedStage)?.name;
  };

  return (
    <>
      <Dialog
        open={open && !isCopying}
        onOpenChange={(val) => {
          // Only allow closing via onOpenChange if we are NOT copying
          if (!isCopying) onOpenChange(val);
        }}
      >
        <DialogContent className="sm:max-w-[441px] p-loop-8">
          <DialogHeader className="relative">
            <DialogTitle className="text-xl font-bold text-gray-900 pr-8">
              {isBulkOperation
                ? `Convert ${fileCount} files to Artifact`
                : 'Convert to Artifact'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-loop-4">
            <p className="text-base font-normal">
              You're about to convert{' '}
              <span className="text-brand-accent-50">
                {getFileDisplayText()}
              </span>{' '}
              into project artifact{isBulkOperation ? 's' : ''}. Choose the
              stage you want to assign {isBulkOperation ? 'them' : 'it'} to and
              confirm.
            </p>
            {/* Stage Selection */}
            <Select
              value={selectedStage}
              onValueChange={setSelectedStage}
              disabled={loading || isCopying}
            >
              <SelectTrigger className="w-full h-loop-10">
                <SelectValue
                  placeholder={loading ? 'Loading stages...' : 'Project Stage'}
                  className="text-base"
                />
              </SelectTrigger>
              <SelectContent
                showDividers={false}
                chevronClassName="text-neutral-grayscale-50"
                className="max-h-[300px] w-[var(--radix-select-trigger-width)] min-w-0 p-loop-4 shadow-lg bg-neutral-grayscale-0 rounded-md border border-neutral-grayscale-20"
              >
                {stages.map((stage) => (
                  <SelectItem
                    key={stage.id}
                    value={stage.id.toString()}
                    className="p-loop-2 text-md cursor-pointer transition-colors duration-200 text-neutral-grayscale-50 rounded-xs focus:bg-neutral-grayscale-10 focus:text-neutral-grayscale-90 data-[state=checked]:bg-neutral-grayscale-10 data-[state=checked]:text-neutral-grayscale-90"
                  >
                    {stage.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

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
                disabled={isCopying}
              />
              <ControlButton
                type="default"
                size="lg"
                text={
                  isCopying
                    ? 'Converting...'
                    : isBulkOperation
                    ? `Convert ${fileCount} files`
                    : 'Convert'
                }
                onClick={handleCopyToStage}
                className="!w-[204px]"
                disabled={isCopying || !selectedStage}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Processing Overlay */}
      {isCopying && (
        <ProcessingFilesOverlay
          uploadingDocuments={processingDocs}
          title="Converting to Artifact"
          description={
            isBulkOperation
              ? `Converting ${fileCount} files to artifacts in ${getTargetStageName()}...`
              : `Converting your file to an artifact in ${getTargetStageName()}...`
          }
        />
      )}
    </>
  );
};
