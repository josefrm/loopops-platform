import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspaceProjectStore } from '@/stores/workspaceProjectStore';
import { useCallback, useState } from 'react';

interface CreateMindspaceFileResponse {
  success: boolean;
  message?: string;
  file?: {
    id: string;
    file_name: string;
    file_path: string;
    file_size: number;
    mime_type: string;
    created_at: string;
    bucket_name: string;
    public_url?: string;
    signed_url?: string;
    category_id?: number;
  };
  error?: string;
}

export const useSaveToMindspace = () => {
  const currentWorkspaceId = useWorkspaceProjectStore(
    (state) => state.currentWorkspaceId,
  );
  const workspacesLoading = useWorkspaceProjectStore(
    (state) => state.workspacesLoading,
  );
  const currentProjectId = useWorkspaceProjectStore(
    (state) => state.currentProjectId,
  );

  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const saveToMindspace = useCallback(
    async (content: string, fileName?: string): Promise<boolean> => {
      // Check for empty content
      if (!content || content.trim().length === 0) {
        toast({
          title: 'Cannot save empty content',
          description: 'The message has no content to save',
          variant: 'destructive',
        });
        return false;
      }

      if (workspacesLoading) {
        toast({
          title: 'Initializing...',
          description: 'Please wait while we connect to your workspace.',
        });
        return false;
      }

      if (!currentWorkspaceId || !currentProjectId) {
        toast({
          title: 'Missing context',
          description: 'Please select a workspace and project first',
          variant: 'destructive',
        });
        return false;
      }

      setIsSaving(true);

      // Show loading toast immediately
      toast({
        title: 'Creating file...',
        description: 'Saving message to Mindspace',
      });

      try {
        const { data, error } =
          await supabase.functions.invoke<CreateMindspaceFileResponse>(
            'create-mindspace-file',
            {
              body: {
                workspace_id: currentWorkspaceId,
                project_id: currentProjectId,
                content,
                file_name: fileName,
                category_id: 1, // Default to "All" category
              },
            },
          );

        if (error) {
          console.error('Error saving to Mindspace:', error);
          toast({
            title: 'Failed to save',
            description:
              error.message || 'An error occurred while saving to Mindspace',
            variant: 'destructive',
          });
          return false;
        }

        if (data?.success) {
          toast({
            title: 'Saved to Mindspace',
            description: `${
              data.file?.file_name || 'Message'
            } has been saved to your Mindspace`,
          });
          return true;
        } else {
          toast({
            title: 'Failed to save',
            description: data?.error || 'An unknown error occurred',
            variant: 'destructive',
          });
          return false;
        }
      } catch (error) {
        console.error('Error saving to Mindspace:', error);
        toast({
          title: 'Failed to save',
          description:
            error instanceof Error
              ? error.message
              : 'An unexpected error occurred',
          variant: 'destructive',
        });
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [currentWorkspaceId, currentProjectId, toast, workspacesLoading],
  );

  return {
    saveToMindspace,
    isSaving,
    canSave: !workspacesLoading && !!currentWorkspaceId && !!currentProjectId,
  };
};
