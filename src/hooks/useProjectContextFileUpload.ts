import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  ProjectContextDocument,
  UploadProjectContextFileResponse,
} from '@/models/ProjectContextDocument';
import {
  WorkspaceProjectStore,
  useWorkspaceProjectStore,
} from '@/stores/workspaceProjectStore';
import { formatFileSize, getFileTypeFromExtension } from '@/utils/fileUtils';
import { useCallback, useRef, useState } from 'react';

export interface UseProjectContextFileUploadOptions {
  onUploadComplete?: (
    documents: ProjectContextDocument[],
    updateDocument: (
      id: string,
      updates: Partial<ProjectContextDocument>,
    ) => void,
  ) => void;
  /** Function to extract metadata for a document (from useMetadataExtraction hook) */
  extractMetadata?: (
    document: ProjectContextDocument,
    projectId: string,
    workspaceId?: string,
  ) => Promise<ProjectContextDocument>;
}

export const useProjectContextFileUpload = (
  options?: UseProjectContextFileUploadOptions,
) => {
  const [documents, setDocuments] = useState<ProjectContextDocument[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Use the new unified store instead of deprecated projectContextStore
  const currentWorkspace = useWorkspaceProjectStore(
    (state: WorkspaceProjectStore) => state.getCurrentWorkspace(),
  );
  const selectedProject = useWorkspaceProjectStore(
    (state: WorkspaceProjectStore) => state.getCurrentProject(),
  );

  // Allowed file extensions matching the edge function
  const allowedExtensions = ['pdf', 'png', 'jpg', 'jpeg', 'docx', 'md', 'txt'];

  // Check if file type is allowed
  const isFileTypeAllowed = (fileName: string): boolean => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    return extension ? allowedExtensions.includes(extension) : false;
  };

  // Generate unique ID for temporary documents
  const generateId = (): string => {
    return `stage-file-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;
  };

  // Internal function to upload a single document and extract metadata
  const uploadDocumentInternal = useCallback(
    async (doc: ProjectContextDocument): Promise<ProjectContextDocument> => {
      if (!doc.file) {
        throw new Error('File not found');
      }

      if (!currentWorkspace?.id) {
        throw new Error('No workspace selected');
      }

      if (!selectedProject?.id) {
        throw new Error('No project selected');
      }

      if (!doc.stageId) {
        throw new Error('No stage selected');
      }

      try {
        // Get auth token
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) {
          throw new Error('Not authenticated');
        }

        // Create form data
        const formData = new FormData();
        formData.append('file', doc.file);
        formData.append('workspace_id', currentWorkspace.id);
        formData.append('project_id', selectedProject.id);
        formData.append('stage_id', doc.stageId);

        // Update progress to show upload started
        setDocuments((prev) =>
          prev.map((d) => (d.id === doc.id ? { ...d, uploadProgress: 10 } : d)),
        );

        // Step 1: Upload the file
        const response = await fetch(
          `${
            import.meta.env.VITE_SUPABASE_URL
          }/functions/v1/upload-project-context-file`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
            body: formData,
          },
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Upload failed');
        }

        const result: UploadProjectContextFileResponse = await response.json();

        if (!result.success || !result.file) {
          throw new Error('Upload failed: No file data returned');
        }

        // Update progress to show upload complete, extracting metadata
        setDocuments((prev) =>
          prev.map((d) => (d.id === doc.id ? { ...d, uploadProgress: 50 } : d)),
        );

        // Build uploaded document for metadata extraction
        let uploadedDoc: ProjectContextDocument = {
          id: result.file.id,
          fileName: result.file.file_name,
          fileSize: formatFileSize(result.file.file_size),
          fileType: getFileTypeFromExtension(result.file.file_name),
          mimeType: result.file.mime_type,
          isUploaded: true,
          uploadProgress: 50,
          createdAt: result.file.created_at,
          signedUrl: result.file.signed_url,
          stageId: doc.stageId,
          storagePath: result.file.file_path,
          bucketName: result.file.bucket_name,
        };

        // Step 2: Extract metadata using the provided function
        if (options?.extractMetadata) {
          const docWithMetadata = await options.extractMetadata(
            uploadedDoc,
            selectedProject.id,
            currentWorkspace.id,
          );
          uploadedDoc = { ...docWithMetadata, uploadProgress: 80 };
        } else {
          uploadedDoc = { ...uploadedDoc, uploadProgress: 80 };
        }

        setDocuments((prev) =>
          prev.map((d) => (d.id === doc.id ? uploadedDoc : d)),
        );

        return uploadedDoc;
      } catch (error) {
        // Reset progress on error
        setDocuments((prev) =>
          prev.map((d) => (d.id === doc.id ? { ...d, uploadProgress: 0 } : d)),
        );

        const errorMessage =
          error instanceof Error ? error.message : 'Upload failed';

        // Provide more specific error message for metadata extraction failures
        const isMetadataError =
          errorMessage.includes('Metadata extraction') ||
          errorMessage.includes('extract-mindspace-metadata');

        toast({
          title: isMetadataError
            ? 'Metadata extraction failed'
            : 'Upload failed',
          description: `${doc.fileName}: ${errorMessage}`,
          variant: 'destructive',
        });

        throw error;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentWorkspace?.id, selectedProject?.id, toast],
  );

  // Update document in state (defined before handleFileSelect which uses it)
  const updateDocument = useCallback(
    (id: string, updates: Partial<ProjectContextDocument>) => {
      setDocuments((prev) =>
        prev.map((doc) => (doc.id === id ? { ...doc, ...updates } : doc)),
      );
    },
    [],
  );

  // Handle file selection with validation and auto-upload
  const handleFileSelect = useCallback(
    async (files: FileList | null, stageId: string) => {
      if (!files) return;

      if (!currentWorkspace?.id) {
        toast({
          title: 'No Workspace Selected',
          description: 'Please refresh the page or select a workspace.',
          variant: 'destructive',
        });
        return;
      }

      if (!selectedProject?.id) {
        toast({
          title: 'No project selected',
          description: 'Please select a project before uploading files',
          variant: 'destructive',
        });
        return;
      }

      if (!stageId) {
        toast({
          title: 'No stage selected',
          description: 'Please select a stage before uploading files',
          variant: 'destructive',
        });
        return;
      }

      const validFiles: File[] = [];
      const invalidFiles: string[] = [];

      // Validate each file
      Array.from(files).forEach((file) => {
        if (isFileTypeAllowed(file.name)) {
          validFiles.push(file);
        } else {
          invalidFiles.push(file.name);
        }
      });

      // Show error for invalid files
      if (invalidFiles.length > 0) {
        const allowedTypes = allowedExtensions
          .map((ext) => ext.toUpperCase())
          .join(', ');
        toast({
          title: 'Invalid file types',
          description: `Only these file types are allowed: ${allowedTypes}`,
          variant: 'destructive',
        });
      }

      // Process valid files and start upload immediately
      if (validFiles.length > 0) {
        const newDocuments: ProjectContextDocument[] = validFiles.map(
          (file) => ({
            id: generateId(),
            fileName: file.name,
            fileSize: formatFileSize(file.size),
            fileType: getFileTypeFromExtension(file.name),
            file: file,
            uploadProgress: 0,
            isUploaded: false,
            stageId: stageId,
          }),
        );

        setDocuments((prev) => [...prev, ...newDocuments]);

        // Auto-upload the new files and collect results with metadata
        const uploadedDocsWithMetadata: ProjectContextDocument[] = [];
        const failedDocs: ProjectContextDocument[] = [];

        try {
          for (const doc of newDocuments) {
            try {
              // uploadDocumentInternal now returns the document with metadata
              const uploadedDoc = await uploadDocumentInternal(doc);
              uploadedDocsWithMetadata.push(uploadedDoc);
            } catch (error) {
              console.error('Error uploading document:', error);
              failedDocs.push(doc);
            }
          }

          // Remove failed documents from state
          if (failedDocs.length > 0) {
            setDocuments((prev) =>
              prev.filter((doc) => !failedDocs.find((fd) => fd.id === doc.id)),
            );
          }

          // Show success toast for successful uploads
          if (uploadedDocsWithMetadata.length > 0) {
            toast({
              title: 'Upload complete',
              description: `Successfully uploaded ${uploadedDocsWithMetadata.length} file(s)`,
            });

            // Call onUploadComplete callback with uploaded documents (including metadata)
            if (options?.onUploadComplete) {
              await options.onUploadComplete(
                uploadedDocsWithMetadata,
                updateDocument,
              );
            }
          }
        } catch (error) {
          console.error('Error during auto-upload:', error);
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      currentWorkspace?.id,
      selectedProject?.id,
      toast,
      uploadDocumentInternal,
      isFileTypeAllowed,
      allowedExtensions,
      updateDocument,
    ],
  );

  // Trigger file input
  const triggerFileSelect = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Remove document from state
  const removeDocument = useCallback((id: string) => {
    setDocuments((prev) => prev.filter((doc) => doc.id !== id));
  }, []);

  // Clear all documents
  const clearDocuments = useCallback(() => {
    setDocuments([]);
  }, []);

  return {
    documents,
    fileInputRef,
    handleFileSelect,
    triggerFileSelect,
    removeDocument,
    updateDocument,
    clearDocuments,
  };
};
