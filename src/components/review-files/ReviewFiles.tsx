import { CircleControlIcon } from '@/components/ui/CircleControlIcon';
import { ControlButton } from '@/components/ui/ControlButton';
import { useToast } from '@/hooks/use-toast';
import { useDeleteProjectFiles } from '@/queries/projectFilesQueries';
import { X } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { WarningBanner } from '../ui/WarningBanner';
import { ReviewFile, ReviewFileItem } from './ReviewFileItem';
import { TableHeader } from './TableHeader';
import { useReviewFiles } from './useReviewFiles';

interface ReviewFilesProps {
  onClose?: () => void;
  initialFiles?: ReviewFile[];
  onConfirm?: (files: ReviewFile[]) => void;
  isProcessing?: boolean;
  showCloseButton?: boolean; // Hide when opened in UniversalDialog (which has its own close)
}

export const ReviewFiles: React.FC<ReviewFilesProps> = ({
  onClose,
  initialFiles,
  onConfirm,
  isProcessing = false,
  showCloseButton = true,
}) => {
  const { toast } = useToast();
  const { mutateAsync: deleteProjectFiles } = useDeleteProjectFiles();

  const { completedFiles, missingInfoFiles, updateFile, deleteFile, files } =
    useReviewFiles(initialFiles);

  // Local state to prevent double-clicks
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Track if initial files were provided to avoid closing on mount
  const hadInitialFiles = useRef(initialFiles && initialFiles.length > 0);

  // Auto-close modal when all files are deleted
  useEffect(() => {
    if (hadInitialFiles.current && files.length === 0 && onClose) {
      onClose();
    }
  }, [files.length, onClose]);

  // Handle file deletion with API call using the hook
  const handleDeleteFile = async (fileId: string) => {
    try {
      toast({
        title: 'Deleting file',
        description: 'File is being deleted...',
      });

      await deleteProjectFiles({ file_ids: [fileId] });

      // Remove file from local state
      deleteFile(fileId);
    } catch (error) {
      console.error('Error deleting file:', error);
      toast({
        title: 'Delete failed',
        description: 'An unexpected error occurred while deleting the file.',
        variant: 'destructive',
      });
    }
  };

  // Check if any files have missing required information
  const hasInvalidFiles = files.some(
    (file) =>
      !file.category ||
      !file.summary ||
      !file.keywords ||
      !file.category ||
      file.summary.trim() === '' ||
      file.keywords.trim() === '',
  );

  return (
    <div className="flex flex-col h-full bg-neutral-grayscale-0 relative">
      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-auto px-loop-16 py-loop-4 pt-loop-14 pb-loop-24">
        {/* Header */}
        <div className="flex flex-col bg-white mb-loop-6 space-y-loop-6">
          {showCloseButton && (
            <div className="flex justify-end h-loop-10">
              <CircleControlIcon
                icon={<X />}
                size="lg"
                type="transparent"
                onClick={onClose}
                label="Close"
              />
            </div>
          )}
          <h1 className="text-2xl font-bold text-neutral-grayscale-90">
            Review Files
          </h1>
          <WarningBanner
            title="IMPORTANT"
            message="Share with Workspace makes this document's knowledge available across all projects in your workspace."
            className=""
          />
        </div>

        <div className="space-y-loop-4">
          {/* Section: Complete File information */}
          {completedFiles.length > 0 && (
            <section className="space-y-loop-4">
              <div className="space-y-loop-4">
                <h2 className="text-lg font-bold text-neutral-grayscale-90">
                  Complete File information
                </h2>
                <p className="text-base text-neutral-grayscale-50">
                  These {completedFiles.length} file{' '}
                  {completedFiles.length === 1 ? 'has' : 'have'} the right
                  metadata.
                </p>

                <TableHeader />
              </div>

              <div className="space-y-loop-4">
                {completedFiles.map((file) => (
                  <ReviewFileItem
                    key={file.id}
                    file={file}
                    onUpdate={updateFile}
                    onDelete={handleDeleteFile}
                    disabled={isProcessing}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Section: Missing file information */}
          {missingInfoFiles.length > 0 && (
            <section className="space-y-loop-4">
              <div className="space-y-loop-4">
                <h2 className="text-lg font-bold text-neutral-grayscale-90">
                  Missing file information
                </h2>
                <p className="text-base text-neutral-grayscale-50">
                  These {missingInfoFiles.length} file{' '}
                  {missingInfoFiles.length === 1 ? 'is' : 'are'} missing key
                  information. Please provide all required details so we can
                  accurately add them as context for your project.
                </p>
              </div>

              <TableHeader />

              <div className="space-y-loop-4">
                {missingInfoFiles.map((file) => (
                  <ReviewFileItem
                    key={file.id}
                    file={file}
                    onUpdate={updateFile}
                    onDelete={handleDeleteFile}
                    disabled={isProcessing}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      {/* Fixed Footer with Fade Gradient */}
      <div className="absolute bottom-0 left-0 right-0 pointer-events-none">
        {/* Fade gradient */}
        <div
          className="h-loop-6"
          style={{
            background: `linear-gradient(to top, var(--neutral-grayscale-0), rgba(255, 255, 255, 0.8), transparent)`,
          }}
        />
        {/* Button container */}
        <div className="bg-neutral-grayscale-0 px-loop-16 pb-loop-6 pt-loop-2 flex justify-end pointer-events-auto">
          <ControlButton
            text={
              isProcessing || isSubmitting
                ? 'Processing...'
                : hasInvalidFiles
                ? 'Missing information'
                : 'Confirm tags'
            }
            onClick={() => {
              if (onConfirm && !isSubmitting) {
                setIsSubmitting(true);
                // Pass current state files back to parent
                onConfirm(files);
              }
            }}
            type="default"
            size="lg"
            disabled={hasInvalidFiles || isProcessing || isSubmitting}
            className="w-[180px]"
          />
        </div>
      </div>
    </div>
  );
};
