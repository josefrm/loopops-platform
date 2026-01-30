import { useToast } from '@/hooks/use-toast';
import { useCurrentStage } from '@/hooks/useCurrentStage';
import { useFileTransfer } from '@/hooks/useFileTransfer';
import { MindspaceDocument } from '@/models/MindspaceDocument';
import { useCallback, useState } from 'react';

interface UseMindspaceActionsProps {
  deleteDocument: (fileId: string) => Promise<boolean>;
  bulkDeleteDocuments?: (
    fileIds: (string | number)[],
  ) => Promise<{ success: boolean; deletedIds: string[] }>;
  bulkDownloadDocuments?: (fileIds: (string | number)[]) => Promise<boolean>;
  openConvertToDeliverableModal: (
    fileIds: string[],
    fileNames: string[],
  ) => void;
  openCreateMode: () => void;
  onFilesDeleted?: (deletedIds?: string[]) => void;
  currentFile?: MindspaceDocument | null; // Currently viewed file in editor
}

export const useMindspaceActions = ({
  deleteDocument,
  bulkDeleteDocuments,
  bulkDownloadDocuments,
  openConvertToDeliverableModal,
  openCreateMode,
  onFilesDeleted,
  currentFile,
}: UseMindspaceActionsProps) => {
  const { toast } = useToast();
  const { transferFilesToChat } = useFileTransfer();
  const { currentStagePriority } = useCurrentStage();

  // Selection state
  const [selectedFiles, setSelectedFiles] = useState<MindspaceDocument[]>([]);
  const [selectedFilesCount, setSelectedFilesCount] = useState(0);
  // Trigger that increments when parent wants to clear checkboxes in MindspaceTabContent
  const [clearSelectionTrigger, setClearSelectionTrigger] = useState(0);

  // Handler for when files are selected in MindspaceTabContent
  const handleFilesSelected = useCallback(
    (files: MindspaceDocument[], count: number) => {
      setSelectedFiles(files);
      setSelectedFilesCount(count);
    },
    [],
  );

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedFiles([]);
    setSelectedFilesCount(0);
    // Increment trigger to notify MindspaceTabContent to clear its checkboxes
    setClearSelectionTrigger((prev) => prev + 1);
  }, []);

  // Clear selection and open create mode
  const clearSelectionAndCreate = useCallback(() => {
    clearSelection();
    openCreateMode();
  }, [clearSelection, openCreateMode]);

  // Download selected files
  const downloadSelectedFiles = useCallback(async () => {
    if (selectedFiles.length === 0) return;

    // Use bulk download if available (downloads as ZIP)
    if (bulkDownloadDocuments) {
      const fileIds = selectedFiles.map((f) => f.id);
      await bulkDownloadDocuments(fileIds);
      return;
    }

    // Fallback to individual downloads
    for (const file of selectedFiles) {
      if (file.signedUrl) {
        try {
          const response = await fetch(file.signedUrl);
          if (!response.ok) throw new Error('Download failed');

          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = file.fileName;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);

          // Small delay between downloads to prevent browser blocking
          await new Promise((resolve) => setTimeout(resolve, 200));
        } catch (error) {
          console.error(`Failed to download ${file.fileName}:`, error);
          // Fallback to opening in new tab
          window.open(file.signedUrl, '_blank');
        }
      }
    }
  }, [selectedFiles, bulkDownloadDocuments]);

  // Convert selected files to deliverable (opens modal for bulk operation)
  const convertSelectedFilesToDeliverable = useCallback(() => {
    if (selectedFiles.length === 0) return;

    // Pass all selected files to the modal
    const fileIds = selectedFiles.map((f) => f.id.toString());
    const fileNames = selectedFiles.map((f) => f.fileName);
    openConvertToDeliverableModal(fileIds, fileNames);
  }, [selectedFiles, openConvertToDeliverableModal]);

  // Start a loop with selected files
  const startLoopWithSelected = useCallback(() => {
    console.log('Starting loop with selected files:', selectedFiles);

    clearSelection();
  }, [selectedFiles, clearSelection]);

  // Start a loop with the currently viewed file
  const startLoopCurrentFile = useCallback(async () => {
    if (!currentFile) return;

    if (!currentFile.signedUrl) {
      toast({
        title: 'Cannot start loop',
        description: 'File URL is not available',
        variant: 'destructive',
      });
      return;
    }

    await transferFilesToChat(
      {
        id: currentFile.id.toString(),
        fileName: currentFile.fileName,
        signedUrl: currentFile.signedUrl,
        mimeType: currentFile.mimeType,
      },
      {
        createNewSession: true,
        stageId: currentStagePriority,
      },
    );
  }, [currentFile, transferFilesToChat, currentStagePriority, toast]);

  // Delete selected files
  const deleteSelectedFiles = useCallback(async () => {
    if (selectedFiles.length === 0) return 0;

    const fileIds = selectedFiles.map((f) => f.id);

    // Use bulk delete if available, otherwise fall back to individual deletes
    if (bulkDeleteDocuments) {
      const result = await bulkDeleteDocuments(fileIds);
      const successCount = result.deletedIds.length;

      // Clear selection after deletion
      clearSelection();

      // Notify parent to refresh if any files were deleted
      if (successCount > 0 && onFilesDeleted) {
        onFilesDeleted(result.deletedIds);
      }

      return successCount;
    } else {
      // Fallback to individual deletes
      let successCount = 0;
      const deletedIds: string[] = [];
      for (const fileId of fileIds) {
        const success = await deleteDocument(fileId.toString());
        if (success) {
          successCount++;
          deletedIds.push(fileId.toString());
        }
      }

      // Clear selection after deletion
      clearSelection();

      // Notify parent to refresh if any files were deleted
      if (successCount > 0 && onFilesDeleted) {
        onFilesDeleted(deletedIds);
      }

      return successCount;
    }
  }, [
    selectedFiles,
    deleteDocument,
    bulkDeleteDocuments,
    clearSelection,
    onFilesDeleted,
  ]);

  return {
    // State
    selectedFiles,
    selectedFilesCount,
    clearSelectionTrigger,

    // Actions
    handleFilesSelected,
    clearSelection,
    clearSelectionAndCreate,
    downloadSelectedFiles,
    convertSelectedFilesToDeliverable,
    startLoopWithSelected,
    startLoopCurrentFile,
    deleteSelectedFiles,
  };
};
