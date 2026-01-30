import React from 'react';
import { DocumentViewer } from '@/components/chat/DocumentViewer';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useDocumentViewerStore } from '@/stores/documentViewerStore';
import { useWorkspaceProjectStore } from '@/stores/workspaceProjectStore';

export const DocumentViewerWrapper: React.FC = () => {
  const { isOpen, document, closeDocument } = useDocumentViewerStore();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const currentWorkspace = useWorkspaceProjectStore((state) =>
    state.getCurrentWorkspace(),
  );
  const selectedProject = useWorkspaceProjectStore((state) =>
    state.getCurrentProject(),
  );

  const handleEditInMindspace = async () => {
    if (!document || !currentWorkspace || !selectedProject || !user?.id) return;

    closeDocument();

    try {
      // First, check if a file with the same filename already exists
      // File paths are stored as: {user_id}/{timestamp}_{sanitizedFilename}
      // We can match by pattern on file_path
      const { data: bucketData, error: bucketError } = await supabase
        .from('loopops_mindspace_buckets')
        .select('id')
        .eq('workspace_id', currentWorkspace.id)
        .eq('project_id', selectedProject.id)
        .eq('user_id', user.id)
        .maybeSingle();

      let existingFileId: string | null = null;

      if (!bucketError && bucketData?.id) {
        // Check if a file with the exact same filename already exists
        const { data: existingFile, error: fileError } = await supabase
          .from('loopops_mindspace_files')
          .select('id')
          .eq('mindspace_bucket_id', bucketData.id)
          .eq('file_name', document.title)
          .maybeSingle();

        if (!fileError && existingFile?.id) {
          existingFileId = existingFile.id;
        }
      }

      // If file exists, use its ID; otherwise create a new file
      let fileId: string;

      if (existingFileId) {
        fileId = existingFileId;
      } else {
        const { data, error } = await supabase.functions.invoke<{
          success: boolean;
          file?: { id: string; file_name: string };
          error?: string;
        }>('create-mindspace-file', {
          body: {
            workspace_id: currentWorkspace.id,
            project_id: selectedProject.id,
            content: document.content,
            file_name: document.title,
            category_id: 1, // Default to "All" category
          },
        });

        if (error || !data?.success || !data.file?.id) {
          toast({
            title: 'Failed to create file',
            description:
              error?.message || data?.error || 'An error occurred while creating the file',
            variant: 'destructive',
          });
          return;
        }

        fileId = data.file.id;
      }

      const params = new URLSearchParams({
        fileId: fileId,
      });

      navigate(`/mindspace?${params.toString()}`);

      toast({
        title: 'Opening in Mindspace',
        description: `${document.title} is ready for editing`,
      });
    } catch (error) {
      console.error('Error creating mindspace file:', error);
      toast({
        title: 'Failed to create file',
        description:
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred',
        variant: 'destructive',
      });
    }
  };

  if (!document) return null;

  return (
    <DocumentViewer
      isOpen={isOpen}
      onClose={closeDocument}
      documentTitle={document.title}
      documentContent={document.content}
      onEditInMindspace={handleEditInMindspace}
    />
  );
};
