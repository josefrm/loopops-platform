import { useToast } from '@/hooks/use-toast';
import { useCurrentStage } from '@/hooks/useCurrentStage';
import { useFileTransfer } from '@/hooks/useFileTransfer';
import {
  useDeleteProjectFiles,
  useDownloadProjectFiles,
} from '@/queries/projectFilesQueries';
import { ProjectStageService } from '@/services/ProjectStageService';
import { useCallback, useState } from 'react';
import { ProjectItem } from '../components/projectContext/ProjectContextTypes';

type BulkActionsConfig = {
  selectedFileIds: string[];
  selectedFilesCount: number;
  selectedFileMetadata: Array<{ id: string; title: string }>;
  stages: Array<{ id: number; name: string; project_stage_id?: string }>;
  activeTabId: number;
  onFetchItems: (stageId: number, actionType: string) => Promise<ProjectItem[]>;
  onSelectionClear: () => void;
  onRefresh: () => void;
  onConvertToDeliverable: (fileNames: string[]) => void;
};

export function useBulkActions(config: BulkActionsConfig) {
  const { toast } = useToast();
  const { transferFilesToChat } = useFileTransfer();
  const { currentStagePriority } = useCurrentStage();
  const downloadFilesMutation = useDownloadProjectFiles();
  const deleteFilesMutation = useDeleteProjectFiles();

  const [isBulkDownloading, setIsBulkDownloading] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const {
    selectedFileIds,
    selectedFilesCount,
    selectedFileMetadata,
    stages,
    activeTabId,
    onFetchItems,
    onSelectionClear,
    onRefresh,
    onConvertToDeliverable,
  } = config;

  // Handle bulk download
  const handleBulkDownload = useCallback(async () => {
    if (selectedFileIds.length === 0) {
      toast({
        title: 'No files selected',
        description: 'Please select files to download.',
        variant: 'destructive',
      });
      return;
    }

    setIsBulkDownloading(true);

    toast({
      title: 'Download started',
      description: `Downloading ${selectedFilesCount} file(s)...`,
    });

    try {
      const result = await downloadFilesMutation.mutateAsync({
        file_ids: selectedFileIds,
      });

      // Create download link using the blob and fileName from result
      const downloadUrl = URL.createObjectURL(result.blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = result.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);

      toast({
        title: 'Download completed',
        description: `${selectedFilesCount} file(s) downloaded successfully.`,
      });
    } catch (error) {
      toast({
        title: 'Download failed',
        description:
          error instanceof Error
            ? error.message
            : 'There was an error downloading the files.',
        variant: 'destructive',
      });
    } finally {
      setIsBulkDownloading(false);
    }
  }, [selectedFileIds, selectedFilesCount, downloadFilesMutation, toast]);

  // Handle bulk delete
  const handleBulkDelete = useCallback(async () => {
    if (selectedFileIds.length === 0) {
      toast({
        title: 'No files selected',
        description: 'Please select files to delete.',
        variant: 'destructive',
      });
      return;
    }

    setIsBulkDeleting(true);
    try {
      const result = await deleteFilesMutation.mutateAsync({
        file_ids: selectedFileIds,
      });

      // Show appropriate message based on bulk vs partial success
      if (result.success_count === selectedFilesCount) {
        toast({
          title: 'Files deleted',
          description: `${result.success_count} file(s) deleted successfully.`,
        });
      } else {
        toast({
          title: 'Partial deletion',
          description: `${result.success_count} of ${selectedFilesCount} file(s) deleted successfully.`,
          variant: 'destructive',
        });
      }

      // Clear selection after successful delete
      onSelectionClear();
      onRefresh();
    } catch (error) {
      toast({
        title: 'Delete failed',
        description:
          error instanceof Error
            ? error.message
            : 'There was an error deleting the files.',
        variant: 'destructive',
      });
    } finally {
      setIsBulkDeleting(false);
    }
  }, [
    selectedFileIds,
    selectedFilesCount,
    deleteFilesMutation,
    toast,
    onSelectionClear,
    onRefresh,
  ]);

  // Handle start loop - fetch files individually to avoid CORS issues
  const handleStartLoop = useCallback(async () => {
    if (selectedFileIds.length === 0) {
      return;
    }

    try {
      toast({
        title: 'Loading files',
        description: `Preparing ${selectedFileIds.length} file(s)...`,
      });

      const activeStage = stages.find((stage) => stage.id === activeTabId);
      if (!activeStage) {
        throw new Error('No active stage found');
      }

      const filesResponse = await onFetchItems(activeStage.id, 'files');
      const selectedFiles = filesResponse.filter((item) =>
        selectedFileIds.includes(item.id.toString()),
      );

      if (selectedFiles.length === 0) {
        toast({
          title: 'No valid files',
          description: 'None of the selected files could be loaded.',
          variant: 'destructive',
        });
        return;
      }

      const filesToTransfer = selectedFiles.map((file) => ({
        id: file.id.toString(),
        fileName: file.title,
        signedUrl: (file as any).signed_url,
        mimeType: (file as any).mime_type,
      }));

      await transferFilesToChat(filesToTransfer, {
        createNewSession: true,
        stageId: currentStagePriority,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description:
          error instanceof Error
            ? error.message
            : 'Failed to start loop with selected files.',
        variant: 'destructive',
      });
    }
  }, [
    selectedFileIds,
    stages,
    activeTabId,
    onFetchItems,
    transferFilesToChat,
    currentStagePriority,
    toast,
  ]);

  // Handle convert to deliverable - use stored metadata instead of fetching
  const handleConvertToDeliverable = useCallback(() => {
    if (selectedFileIds.length === 0) {
      return;
    }

    // Extract file names from the stored metadata
    const fileNames = selectedFileMetadata.map((file) => file.title);
    onConvertToDeliverable(fileNames);
  }, [selectedFileIds, selectedFileMetadata, onConvertToDeliverable]);

  // Handle bulk delete artifacts (revert them to files)
  const handleBulkDeleteDeliverables = useCallback(async () => {
    if (selectedFileIds.length === 0) {
      toast({
        title: 'No artifacts selected',
        description: 'Please select artifacts to remove.',
        variant: 'destructive',
      });
      return;
    }

    setIsBulkDeleting(true);

    try {
      // Use ProjectStageService to toggle deliverable status (revert)
      const result = await ProjectStageService.toggleDeliverable(
        undefined,
        selectedFileIds,
      );

      if (result.success) {
        const count = selectedFileIds.length;
        toast({
          title: 'Deliverables removed',
          description: `${count} deliverable(s) removed successfully.`,
        });

        // Clear selection after successful delete/revert
        onSelectionClear();
        onRefresh();
      } else {
        throw new Error(result.error || 'Failed to remove artifacts');
      }
    } catch (error) {
      toast({
        title: 'Remove failed',
        description:
          error instanceof Error
            ? error.message
            : 'There was an error removing the artifacts.',
        variant: 'destructive',
      });
    } finally {
      setIsBulkDeleting(false);
    }
  }, [selectedFileIds, toast, onSelectionClear, onRefresh]);

  // Handle bulk download artifacts (same logic as files but specific messages/state if needed)
  const handleBulkDownloadDeliverables = useCallback(async () => {
    if (selectedFileIds.length === 0) {
      toast({
        title: 'No artifacts selected',
        description: 'Please select artifacts to download.',
        variant: 'destructive',
      });
      return;
    }

    setIsBulkDownloading(true);

    toast({
      title: 'Download started',
      description: `Downloading ${selectedFilesCount} artifact(s)...`,
    });

    try {
      const result = await downloadFilesMutation.mutateAsync({
        file_ids: selectedFileIds,
      });

      // Create download link using the blob and fileName from result
      // Override filename for artifacts if it's a zip
      const fileName = result.isSingle ? result.fileName : 'artifacts.zip';
      const downloadUrl = URL.createObjectURL(result.blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);

      toast({
        title: 'Download completed',
        description: `${selectedFilesCount} deliverable(s) downloaded successfully.`,
      });
    } catch (error) {
      toast({
        title: 'Download failed',
        description:
          error instanceof Error
            ? error.message
            : 'There was an error downloading the artifacts.',
        variant: 'destructive',
      });
    } finally {
      setIsBulkDownloading(false);
    }
  }, [selectedFileIds, selectedFilesCount, downloadFilesMutation, toast]);

  return {
    handleBulkDownload,
    handleBulkDelete,
    handleStartLoop,
    handleConvertToDeliverable,
    handleBulkDeleteDeliverables,
    handleBulkDownloadDeliverables,
    isBulkDownloading,
    isBulkDeleting,
  };
}
