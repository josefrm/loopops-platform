import { useToast } from '@/hooks/use-toast';
import { useFileTransfer } from '@/hooks/useFileTransfer';
import { useGetProjectFiles } from '@/queries/projectFilesQueries';
import { useState } from 'react';

interface StartLoopOptions {
  fileIds: string[];
  enabled?: boolean;
}

/**
 * Hook to start a loop with selected files
 * Uses React Query to fetch file details with caching
 */
export const useStartLoop = ({ fileIds, enabled = false }: StartLoopOptions) => {
  const { toast } = useToast();
  const { transferFilesToChat } = useFileTransfer();
  const [isStarting, setIsStarting] = useState(false);

  // Use React Query to fetch file details with caching
  const { data: filesData, error, isLoading } = useGetProjectFiles(fileIds, enabled);

  const startLoop = async () => {
    if (fileIds.length === 0) {
      toast({
        title: 'No files selected',
        description: 'Please select files to start a loop.',
        variant: 'destructive',
      });
      return;
    }

    setIsStarting(true);
    try {
      // If data is already cached, use it directly
      if (!filesData) {
        throw new Error('Failed to fetch file details');
      }

      // Prepare file data for transfer
      const filesToTransfer = filesData.files.map((fileData: any) => ({
        id: fileData.id,
        fileName: fileData.file_name,
        signedUrl: fileData.signed_url,
        mimeType: fileData.mime_type,
      }));

      // Use centralized hook to transfer files
      await transferFilesToChat(filesToTransfer);
    } catch (err) {
      console.error('Error starting loop with files:', err);
      toast({
        title: 'Error',
        description:
          err instanceof Error
            ? err.message
            : 'Failed to start loop with selected files.',
        variant: 'destructive',
      });
    } finally {
      setIsStarting(false);
    }
  };

  return {
    startLoop,
    isStarting: isStarting || isLoading,
    error,
    filesData,
  };
};
