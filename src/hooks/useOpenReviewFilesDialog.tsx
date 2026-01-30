import { ReviewFile } from '@/components/review-files/ReviewFileItem';
import { ReviewFiles } from '@/components/review-files/ReviewFiles';
import { useDialogControl } from '@/contexts/DialogControlContext';
import { useDialogCustomization } from '@/hooks/useDialogCustomization';

interface OpenReviewFilesOptions {
  files: ReviewFile[];
  onConfirm?: () => void;
  isProcessing?: boolean;
}

/**
 * Hook to open ReviewFiles component in a dialog.
 * Uses DialogControlContext to manage the dialog and applies proper styling.
 *
 * @example
 * const { openReviewFilesDialog } = useOpenReviewFilesDialog();
 *
 * // After file upload:
 * openReviewFilesDialog({
 *   files: uploadedFiles,
 *   onConfirm: () => {
 *     console.log('Files confirmed');
 *   }
 * });
 */
export const useOpenReviewFilesDialog = () => {
  const { openDialogWithChildren, closeDialog } = useDialogControl();
  const { setGradient, setTitle, resetBackground, setCloseStyle } =
    useDialogCustomization();

  const openReviewFilesDialog = ({
    files,
    onConfirm,
    isProcessing = false,
  }: OpenReviewFilesOptions) => {
    // Customize dialog appearance
    setTitle('Review Files');
    setGradient('custom', { backgroundColor: 'var(--neutral-grayscale-0)' });
    setCloseStyle({
      color: 'var(--neutral-grayscale-50)',
    });

    // Open dialog with ReviewFiles component
    openDialogWithChildren(
      <ReviewFiles
        initialFiles={files}
        onClose={closeDialog}
        onConfirm={() => {
          onConfirm?.();
          closeDialog();
          resetBackground();
        }}
        isProcessing={isProcessing}
        showCloseButton={false} // Hide ReviewFiles close since UniversalDialog has one
      />,
    );
  };

  return { openReviewFilesDialog, closeReviewFilesDialog: closeDialog };
};
