import { useToast } from '@/hooks/use-toast';
import { useFileTypeFiltering } from '@/hooks/useFileTypeFiltering';
import { useMindspaceFileUpload } from '@/hooks/useMindspaceFileUpload';
import { supabase } from '@/integrations/supabase/client';
import {
  ASSETS_QUERY_KEY,
  useProjectAssets,
} from '@/queries/projectContextQueries';
import { useWorkspaceProjectStore } from '@/stores/workspaceProjectStore';
import { useQueryClient } from '@tanstack/react-query';
import React, { useCallback, useState } from 'react';
import { formatFileSize } from '../../utils/fileUtils';
import { MindspaceItemContent } from '../mindspace/MindspaceItemContent';
import { AILoadingState } from '../ui/AILoadingState';
import { ProjectItem } from './ProjectContextTypes';

interface AssetsTabDisplayProps {
  selectedFileType?: string;
  selectedSort?: string;
  onSelectedFilesChange?: (
    ids: string[],
    count: number,
    metadata: { id: string; title: string }[],
  ) => void;
}

export const AssetsTabDisplay: React.FC<AssetsTabDisplayProps> = ({
  selectedFileType = 'all',
  selectedSort = 'newest-to-oldest',
  onSelectedFilesChange,
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { bulkDownloadDocuments } = useMindspaceFileUpload({
    autoFetch: false,
  });

  const selectedProject = useWorkspaceProjectStore((state) =>
    state.getCurrentProject(),
  );

  // Use cached query instead of local state fetching
  const { data: items = [], isLoading: isLoadingItems } = useProjectAssets(
    selectedProject?.id,
  );

  const [checkedItems, setCheckedItems] = useState<Set<string | number>>(
    new Set(),
  );

  // State for tracking items being deleted (for animation)
  const [deletingItems, setDeletingItems] = useState<Set<string | number>>(
    new Set(),
  );

  // Helper function to download a single file using the hook's bulkDownloadDocuments
  const downloadFile = useCallback(
    async (fileId: string) => {
      try {
        const success = await bulkDownloadDocuments([fileId]);
        if (!success) {
          // Error handling is already done in the hook
          console.error('Download failed for file:', fileId);
        }
      } catch (error) {
        console.error('Error downloading file:', error);
        toast({
          title: 'Download failed',
          description:
            error instanceof Error
              ? error.message
              : 'An error occurred while downloading the file.',
          variant: 'destructive',
        });
      }
    },
    [bulkDownloadDocuments, toast],
  );

  // Helper function to delete a single file with animation
  const deleteFile = useCallback(
    async (fileId: string, fileName: string) => {
      // Mark item as being deleted for animation
      setDeletingItems((prev) => new Set(prev).add(fileId));

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          throw new Error('No active session found');
        }

        const response = await fetch(
          `${
            import.meta.env.VITE_SUPABASE_URL
          }/functions/v1/delete-project-files`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              file_id: fileId,
            }),
          },
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to delete file');
        }

        const result = await response.json();

        if (result.success) {
          toast({
            title: 'File deleted',
            description: `${fileName} has been deleted successfully.`,
          });

          // Wait for animation to complete before removing from state
          setTimeout(() => {
            // Optimistic update of the cache
            queryClient.setQueryData(
              [ASSETS_QUERY_KEY, selectedProject?.id],
              (oldData: ProjectItem[] | undefined) => {
                if (!oldData) return [];
                return oldData.filter((item) => item.id.toString() !== fileId);
              },
            );

            // Remove from deleting state
            setDeletingItems((prev) => {
              const newSet = new Set(prev);
              newSet.delete(fileId);
              return newSet;
            });
            // Remove from checked items if it was selected
            setCheckedItems((prev) => {
              const newSet = new Set(prev);
              newSet.delete(fileId);
              // Update parent about selection change
              if (onSelectedFilesChange) {
                const fileIds = Array.from(newSet).map((id) => String(id));
                const currentItems = items.filter(
                  (i) => i.id.toString() !== fileId,
                );
                const fileMetadata = currentItems
                  .filter((item) => newSet.has(item.id))
                  .map((item) => ({ id: String(item.id), title: item.title }));
                onSelectedFilesChange(fileIds, newSet.size, fileMetadata);
              }
              return newSet;
            });
          }, 300); // Match the animation duration
        } else {
          throw new Error(result.error || 'Failed to delete file');
        }
      } catch (error) {
        console.error('Error deleting file:', error);
        // Remove from deleting state on error
        setDeletingItems((prev) => {
          const newSet = new Set(prev);
          newSet.delete(fileId);
          return newSet;
        });
        toast({
          title: 'Delete failed',
          description:
            error instanceof Error
              ? error.message
              : 'An error occurred while deleting the file.',
          variant: 'destructive',
        });
      }
    },
    [toast, onSelectedFilesChange, queryClient, selectedProject?.id, items],
  );

  // Apply filtering
  const filteredAndSortedItems = useFileTypeFiltering(
    items,
    selectedFileType as any,
    selectedSort as any,
  );

  // Handle checkbox changes
  const handleCheckboxChange = useCallback(
    (itemId: string | number, checked: boolean) => {
      setCheckedItems((prev) => {
        const newSet = new Set(prev);
        if (checked) {
          newSet.add(itemId);
        } else {
          newSet.delete(itemId);
        }
        // Notify parent of selection change
        if (onSelectedFilesChange) {
          const fileIds = Array.from(newSet).map((id) => String(id));
          const fileMetadata = items
            .filter((item) => newSet.has(item.id))
            .map((item) => ({ id: String(item.id), title: item.title }));
          onSelectedFilesChange(fileIds, newSet.size, fileMetadata);
        }
        return newSet;
      });
    },
    [onSelectedFilesChange, items],
  );

  const showLoading = isLoadingItems;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 min-h-0 w-full relative">
        <div className="h-full overflow-y-auto overflow-x-hidden scrollbar-hide pr-loop-2">
          {showLoading ? (
            <div className="flex items-center justify-center h-full p-loop-8 pr-loop-2">
              <AILoadingState message="Loading your assets..." />
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-loop-8 pr-loop-2">
              <img
                src="/images/no-files.png"
                alt="No files"
                className="mb-loop-4"
              />
              <p className="text-neutral-grayscale-40 text-lg text-center">
                Start the Onboarding Phase to upload your first project asset.
              </p>
            </div>
          ) : filteredAndSortedItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-loop-8 pr-loop-2">
              <img
                src="/images/no-files.png"
                alt="No matches"
                className="mb-loop-4"
              />
              <p className="text-neutral-grayscale-40 text-lg text-center">
                No items match your filters.
              </p>
            </div>
          ) : (
            <div className="pb-loop-4">
              {filteredAndSortedItems.map((item) => {
                const isChecked = checkedItems.has(item.id);
                const isDeleting = deletingItems.has(item.id);

                return (
                  <div
                    key={item.id}
                    className={`transition-all duration-300 ease-out overflow-hidden ${
                      isDeleting
                        ? 'transform translate-x-full opacity-0 h-0 mb-0'
                        : 'transform translate-x-0 opacity-100 h-auto mb-loop-4'
                    }`}
                  >
                    <MindspaceItemContent
                      fileName={item.title}
                      fileSize={
                        (item as any).file_size
                          ? formatFileSize((item as any).file_size)
                          : 'Unknown size'
                      }
                      createdDate={item.created_at}
                      isSelected={isChecked}
                      createdInEditor={item.createdInEditor}
                      signedUrl={(item as any).signed_url}
                      fileId={
                        typeof item.id === 'string'
                          ? item.id
                          : item.id.toString()
                      }
                      mimeType={(item as any).mime_type}
                      belongsToStage={item.keyDeliverable}
                      onSelect={(checked: boolean) =>
                        handleCheckboxChange(item.id, checked)
                      }
                      onClick={() => console.log('Clicked item:', item.id)}
                      onDownload={() => downloadFile(item.id.toString())}
                      onDelete={() =>
                        deleteFile(item.id.toString(), item.title)
                      }
                      isDeliverable={item.isDeliverable}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
        {/* Fade gradient indicator for overflow content */}
        {filteredAndSortedItems.length > 3 && (
          <div
            className="absolute bottom-0 left-0 right-0 h-8 pointer-events-none"
            style={{
              background: `linear-gradient(to top, var(--neutral-grayscale-0), rgba(255, 255, 255, 0.8), transparent)`,
            }}
          />
        )}
      </div>
    </div>
  );
};
