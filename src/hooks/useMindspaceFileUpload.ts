import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  GetMindspaceFilesResponse,
  MindspaceDocument,
  mindspaceFileToDocument,
} from '@/models/MindspaceDocument';
import { useWorkspaceProjectStore } from '@/stores/workspaceProjectStore';
import {
  formatFileSize,
  getFileTypeFromExtension,
  isFileEditable,
} from '@/utils/fileUtils';
import { extractRawText } from 'mammoth';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

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

interface UpdateMindspaceFileResponse {
  success: boolean;
  message?: string;
  file?: {
    id: string;
    file_name: string;
    file_path: string;
    file_size: number;
    mime_type: string;
    updated_at: string;
    bucket_name?: string;
    signed_url?: string;
  };
  error?: string;
}

interface DeleteMindspaceFileResponse {
  success: boolean;
  message?: string;
  file?: {
    id: string;
    file_name: string;
    file_path: string;
  };
  storage_deletion_status?: string;
  error?: string;
}

interface BulkDeleteMindspaceFileResponse {
  success: boolean;
  message: string;
  total: number;
  success_count: number;
  failure_count: number;
  results: Array<{
    id: string;
    file_name: string;
    file_path: string;
    success: boolean;
    error?: string;
    storage_deletion_status: 'success' | 'failed';
  }>;
}

export const useMindspaceFileUpload = (
  options: { autoFetch?: boolean } = { autoFetch: true },
) => {
  const [documents, setDocuments] = useState<MindspaceDocument[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // Start as true to show skeleton on initial load
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Use the new unified store instead of deprecated contexts
  const currentWorkspace = useWorkspaceProjectStore((state) =>
    state.getCurrentWorkspace(),
  );
  const workspacesLoading = useWorkspaceProjectStore(
    (state) => state.workspacesLoading,
  );
  const selectedProject = useWorkspaceProjectStore((state) =>
    state.getCurrentProject(),
  );
  const { toast } = useToast();

  // Allowed file extensions
  const allowedExtensions = useMemo(
    () => ['pdf', 'doc', 'docx', 'txt', 'md', 'png', 'jpg', 'jpeg'],
    [],
  );

  // Check if file type is allowed
  const isFileTypeAllowed = useCallback(
    (fileName: string): boolean => {
      const extension = fileName.split('.').pop()?.toLowerCase();
      return extension ? allowedExtensions.includes(extension) : false;
    },
    [allowedExtensions],
  );

  // Generate unique ID
  const generateId = (): string => {
    return `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  // Fetch mindspace files from the API
  const fetchMindspaceFiles = async (
    workspaceId: string,
    projectId: string,
    accessToken: string,
  ): Promise<MindspaceDocument[]> => {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-mindspace-files`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workspace_id: workspaceId,
          project_id: projectId,
        }),
      },
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error(errorData);
      return [];
    }

    const data: GetMindspaceFilesResponse = await response.json();
    const converted = data.files.map(mindspaceFileToDocument);
    return converted;
  };

  // Fetch documents from mindspace
  const fetchDocuments = useCallback(async () => {
    const workspaceId = currentWorkspace?.id;
    const projectId = selectedProject?.id;

    if (!workspaceId || !projectId) {
      setDocuments([]);
      return;
    }

    setIsLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        console.log('No session found, skipping fetch');
        return;
      }

      const mindspaceDocuments = await fetchMindspaceFiles(
        workspaceId,
        projectId,
        session.access_token,
      );

      // Sort by createdAt descending (newest first)
      mindspaceDocuments.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });

      setDocuments(mindspaceDocuments);
    } catch (error) {
      toast({
        title: 'Error',
        description: `Failed to fetch documents. Please try again. ${
          error instanceof Error ? ` ${error.message}` : ''
        }`,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentWorkspace?.id, selectedProject?.id, toast]);

  // Fetch documents when workspace or project changes
  useEffect(() => {
    if (options.autoFetch) {
      fetchDocuments();
    }
  }, [fetchDocuments, options.autoFetch]);

  // Internal function to upload a document (used by handleFileSelect and uploadDocument)
  const uploadDocumentInternal = useCallback(
    async (
      doc: MindspaceDocument,
      categoryIdArg?: number,
    ): Promise<CreateMindspaceFileResponse> => {
      // Priority: Argument > Document Property > Default (1)
      const effectiveCategoryId = categoryIdArg || doc.categoryId || 1;

      if (!doc.file) {
        throw new Error('File not found');
      }

      // Validate workspace and project
      if (workspacesLoading) {
        toast({
          title: 'Initializing...',
          description: 'Please wait while we connect to your workspace.',
        });
        throw new Error('Workspace loading');
      }

      if (!currentWorkspace?.id) {
        throw new Error('No workspace selected');
      }

      if (!selectedProject) {
        throw new Error('No project selected');
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
        formData.append('category_id', effectiveCategoryId.toString());

        // Update progress to show upload started
        setDocuments((prev) =>
          prev.map((d) => (d.id === doc.id ? { ...d, uploadProgress: 5 } : d)),
        );

        // Use XMLHttpRequest for upload progress tracking
        const result = await new Promise<CreateMindspaceFileResponse>(
          (resolve, reject) => {
            const xhr = new XMLHttpRequest();

            // Track upload progress
            xhr.upload.onprogress = (event) => {
              if (event.lengthComputable) {
                // Calculate progress from 5% to 90% (leaving room for server processing)
                const percentComplete = Math.round(
                  5 + (event.loaded / event.total) * 85,
                );
                setDocuments((prev) =>
                  prev.map((d) =>
                    d.id === doc.id
                      ? { ...d, uploadProgress: percentComplete }
                      : d,
                  ),
                );
              }
            };

            xhr.onload = () => {
              if (xhr.status >= 200 && xhr.status < 300) {
                try {
                  const response = JSON.parse(xhr.responseText);
                  resolve(response);
                } catch {
                  reject(new Error('Invalid response from server'));
                }
              } else {
                try {
                  const errorData = JSON.parse(xhr.responseText);
                  reject(new Error(errorData.error || 'Upload failed'));
                } catch {
                  reject(new Error(`Upload failed with status ${xhr.status}`));
                }
              }
            };

            xhr.onerror = () => {
              reject(new Error('Network error during upload'));
            };

            xhr.open(
              'POST',
              `${
                import.meta.env.VITE_SUPABASE_URL
              }/functions/v1/upload-mindspace-file`,
            );
            xhr.setRequestHeader(
              'Authorization',
              `Bearer ${session.access_token}`,
            );
            xhr.send(formData);
          },
        );

        // Set progress to 95% while processing server response
        setDocuments((prev) =>
          prev.map((d) => (d.id === doc.id ? { ...d, uploadProgress: 95 } : d)),
        );

        // Replace temp document with the real one from server
        if (result.success && result.file) {
          const newDocument: MindspaceDocument = {
            id: result.file.id,
            fileName: result.file.file_name,
            fileSize: formatFileSize(result.file.file_size),
            fileType: getFileTypeFromExtension(result.file.file_name),
            mimeType: result.file.mime_type,
            isUploaded: true,
            uploadProgress: 100,
            createdAt: result.file.created_at,
            signedUrl: result.file.public_url || result.file.signed_url,
            createdInEditor: false,
            categoryId: result.file.category_id || effectiveCategoryId,
          };

          setDocuments((prev) =>
            prev.map((d) => (d.id === doc.id ? newDocument : d)),
          );
        } else {
          // Fallback: just mark as uploaded if no file data returned
          setDocuments((prev) =>
            prev.map((d) =>
              d.id === doc.id
                ? { ...d, isUploaded: true, uploadProgress: 100 }
                : d,
            ),
          );
        }

        return result;
      } catch (error) {
        // Reset progress on error
        setDocuments((prev) =>
          prev.map((d) => (d.id === doc.id ? { ...d, uploadProgress: 0 } : d)),
        );

        const errorMessage =
          error instanceof Error ? error.message : 'Upload failed';
        toast({
          title: 'Upload failed',
          description: `${doc.fileName}: ${errorMessage}`,
          variant: 'destructive',
        });

        throw error;
      }
    },
    [currentWorkspace, selectedProject, toast, workspacesLoading],
  );

  // Handle file selection with validation and auto-upload
  const handleFileSelect = useCallback(
    async (files: FileList | null, categoryId: number = 1) => {
      if (!files) return;

      // Validate workspace and project before processing
      if (workspacesLoading) {
        toast({
          title: 'Initializing...',
          description: 'Please wait while we connect to your workspace.',
        });
        return;
      }

      if (!currentWorkspace?.id) {
        // If we're not loading but still don't have a workspace, show error
        console.error('[useMindspaceFileUpload] Error: No workspace selected', {
          currentWorkspace,
          workspacesLoading,
        });
        toast({
          title: 'No Workspace Selected',
          description: 'Please refresh the page or select a workspace.',
          variant: 'destructive',
        });
        return;
      }

      if (!selectedProject) {
        toast({
          title: 'No project selected',
          description: 'Please select a project before uploading files',
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
        const now = new Date().toISOString();
        const newDocuments: MindspaceDocument[] = validFiles.map((file) => ({
          id: generateId(),
          fileName: file.name,
          fileSize: formatFileSize(file.size),
          fileType: getFileTypeFromExtension(file.name),
          file: file,
          uploadProgress: 0,
          isUploaded: false,
          categoryId: categoryId,
          createdAt: now, // Set creation time for display
        }));

        // Prepend new documents so they appear at the top (newest first)
        setDocuments((prev) => [...newDocuments, ...prev]);

        // Auto-upload the new files
        setIsUploading(true);
        try {
          for (const doc of newDocuments) {
            await uploadDocumentInternal(doc, categoryId);
          }
          toast({
            title: 'Upload complete',
            description: `Successfully uploaded ${newDocuments.length} file(s)`,
          });
          // Documents are now updated in place with server-generated IDs
        } catch (error) {
          console.error('Error during auto-upload:', error);
          // Individual errors are already toasted in uploadDocumentInternal
        } finally {
          setIsUploading(false);
        }
      }
    },
    [
      currentWorkspace,
      selectedProject,
      toast,
      uploadDocumentInternal,
      workspacesLoading,
      isFileTypeAllowed,
      allowedExtensions,
    ],
  );

  // Trigger file input
  const triggerFileSelect = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Remove document
  const removeDocument = useCallback((id: string) => {
    setDocuments((prev) => prev.filter((doc) => doc.id !== id));
  }, []);

  // Upload a single document by ID (public API)
  const uploadDocument = useCallback(
    async (id: string): Promise<void> => {
      const doc = documents.find((d) => d.id === id);
      if (!doc || !doc.file) {
        throw new Error('Document or file not found');
      }

      setIsUploading(true);
      try {
        await uploadDocumentInternal(doc);
        toast({
          title: 'Upload successful',
          description: `${doc.fileName} has been uploaded to Mindspace`,
        });
      } finally {
        setIsUploading(false);
      }
    },
    [documents, uploadDocumentInternal, toast],
  );

  // Upload all documents
  const uploadAllDocuments = useCallback(async () => {
    const unuploadedDocs = documents.filter(
      (doc) => !doc.isUploaded && doc.file,
    );

    if (unuploadedDocs.length === 0) {
      toast({
        title: 'No files to upload',
        description: 'All files have already been uploaded',
      });
      return;
    }

    setIsUploading(true);
    try {
      // Upload files one by one to show progress
      for (const doc of unuploadedDocs) {
        await uploadDocumentInternal(doc);
      }

      toast({
        title: 'All files uploaded',
        description: `Successfully uploaded ${unuploadedDocs.length} file(s)`,
      });
      // Refetch documents to get server-generated IDs and signed URLs
      await fetchDocuments();
    } catch (error) {
      console.error('Error uploading files:', error);
      // Individual errors are already toasted in uploadDocumentInternal
    } finally {
      setIsUploading(false);
    }
  }, [documents, uploadDocumentInternal, toast, fetchDocuments]);

  // Create a new markdown file from content
  const createMarkdownFile = useCallback(
    async (
      content: string,
      fileName?: string,
      categoryId: number = 1,
    ): Promise<{ success: boolean; file?: MindspaceDocument }> => {
      // Check for empty content
      if (!content || content.trim().length === 0) {
        toast({
          title: 'Cannot save empty file',
          description: 'Please add some content before saving',
          variant: 'destructive',
        });
        return { success: false };
      }

      if (workspacesLoading) {
        toast({
          title: 'Initializing...',
          description: 'Please wait while we connect to your workspace.',
        });
        return { success: false };
      }

      if (!currentWorkspace?.id || !selectedProject?.id) {
        toast({
          title: 'Missing context',
          description: 'Please select a workspace and project first',
          variant: 'destructive',
        });
        return { success: false };
      }

      // Create a temporary document with progress to show at the top of the list
      const tempId = `temp-${Date.now()}`;
      const tempDocument: MindspaceDocument = {
        id: tempId,
        fileName: fileName || 'Creating document...',
        fileSize: `${Math.round(content.length / 1024)} KB`,
        fileType: 'markdown',
        mimeType: 'text/markdown',
        isUploaded: false,
        uploadProgress: 0,
        createdAt: new Date().toISOString(),
        createdInEditor: true,
        categoryId: categoryId,
      };

      // Add temp document to show progress
      setDocuments((prev) => [tempDocument, ...prev]);

      try {
        // Simulate progress
        const progressSteps = [20, 40, 60, 80];
        for (const progress of progressSteps) {
          setDocuments((prev) =>
            prev.map((doc) =>
              doc.id === tempId ? { ...doc, uploadProgress: progress } : doc,
            ),
          );
          await new Promise((resolve) => setTimeout(resolve, 100));
        }

        const { data, error } =
          await supabase.functions.invoke<CreateMindspaceFileResponse>(
            'create-mindspace-file',
            {
              body: {
                workspace_id: currentWorkspace.id,
                project_id: selectedProject.id,
                content,
                file_name: fileName,
                category_id: categoryId,
              },
            },
          );

        if (error) {
          console.error('Error creating markdown file:', error);
          // Remove temp document on error
          setDocuments((prev) => prev.filter((doc) => doc.id !== tempId));
          toast({
            title: 'Failed to create file',
            description:
              error.message || 'An error occurred while saving the file',
            variant: 'destructive',
          });
          return { success: false };
        }

        if (data?.success) {
          // Complete progress animation
          setDocuments((prev) =>
            prev.map((doc) =>
              doc.id === tempId ? { ...doc, uploadProgress: 100 } : doc,
            ),
          );

          // Small delay to show 100% progress
          await new Promise((resolve) => setTimeout(resolve, 200));

          // Replace temp document with actual created file
          let newDocument: MindspaceDocument | undefined;
          if (data.file) {
            newDocument = {
              id: data.file.id,
              fileName: data.file.file_name,
              fileSize: formatFileSize(data.file.file_size),
              fileType: getFileTypeFromExtension(data.file.file_name),
              mimeType: data.file.mime_type,
              isUploaded: true,
              uploadProgress: 100,
              createdAt: data.file.created_at,
              signedUrl: data.file.public_url || data.file.signed_url,
              createdInEditor: true,
              categoryId: data.file.category_id || categoryId,
            };

            // Replace temp document with the real one
            setDocuments((prev) =>
              prev.map((doc) => (doc.id === tempId ? newDocument : doc)),
            );
          } else {
            // Remove temp document and refresh list
            setDocuments((prev) => prev.filter((doc) => doc.id !== tempId));
            await fetchDocuments();
          }

          toast({
            title: 'File created',
            description: `${
              data.file?.file_name || 'Document'
            } has been saved to Mindspace`,
          });
          return { success: true, file: newDocument };
        } else {
          // Remove temp document on error
          setDocuments((prev) => prev.filter((doc) => doc.id !== tempId));
          toast({
            title: 'Failed to create file',
            description: data?.error || 'An unknown error occurred',
            variant: 'destructive',
          });
          return { success: false };
        }
      } catch (error) {
        console.error('Error creating markdown file:', error);
        // Remove temp document on error
        setDocuments((prev) => prev.filter((doc) => doc.id !== tempId));
        toast({
          title: 'Failed to create file',
          description:
            error instanceof Error
              ? error.message
              : 'An unexpected error occurred',
          variant: 'destructive',
        });
        return { success: false };
      }
    },
    [
      currentWorkspace?.id,
      selectedProject?.id,
      toast,
      fetchDocuments,
      workspacesLoading,
    ],
  );

  // Fetch content of a markdown/text file using file ID (more reliable than signed URL)
  const fetchFileContent = useCallback(
    async (fileId: string): Promise<string | null> => {
      try {
        // Use the file ID to get file metadata and download content directly
        const { data: fileData, error: fileError } = await supabase
          .from('loopops_mindspace_files')
          .select(
            'file_path, mindspace_bucket_id, mime_type, loopops_mindspace_buckets(bucket_name)',
          )
          .eq('id', fileId)
          .single();

        if (fileError || !fileData) {
          throw new Error('Failed to fetch file metadata');
        }

        const bucketName = (fileData as any).loopops_mindspace_buckets
          ?.bucket_name;
        const mimeType = (fileData as any).mime_type;

        if (!bucketName) {
          throw new Error('Bucket name not found');
        }

        // Use createSignedUrl with cache-busting to ensure fresh content
        // Direct download() can return cached content from CDN
        const { data: signedUrlData, error: signedUrlError } =
          await supabase.storage
            .from(bucketName)
            .createSignedUrl(fileData.file_path, 60); // 60 seconds expiry

        if (signedUrlError || !signedUrlData?.signedUrl) {
          throw new Error('Failed to create signed URL');
        }

        // Add cache-busting query parameter
        const cacheBustUrl = `${signedUrlData.signedUrl}&_cb=${Date.now()}`;

        // Fetch content from signed URL with cache-control headers
        const response = await fetch(cacheBustUrl, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            Pragma: 'no-cache',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to download file content');
        }

        const blob = await response.blob();

        // Only try to parse with mammoth for actual Word documents
        // Files that were converted to text/markdown should be read as plain text
        // Content Sniffing: Check if the file is actually a Zip (Docx) or Plain Text
        // We do this because the user might have saved plain text content to a .docx file
        if (
          mimeType ===
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
          mimeType === 'application/msword'
        ) {
          try {
            const arrayBuffer = await blob.arrayBuffer();
            const view = new Uint8Array(arrayBuffer);

            // Check for Zip signature (PK..) - generic check for docx/zip
            // P = 0x50, K = 0x4b
            const isZipInfo =
              view.length >= 2 && view[0] === 0x50 && view[1] === 0x4b;

            if (isZipInfo) {
              // It's a binary Word doc (Zip), use mammoth to extract text
              const result = await extractRawText({
                arrayBuffer: arrayBuffer,
              });
              return result.value;
            } else {
              // It's NOT a zip, so it must be the plain text content we saved
              console.log(
                'File has docx mime-type but is not a zip, reading as text',
              );
              // Convert array buffer to text
              return new TextDecoder().decode(arrayBuffer);
            }
          } catch (error) {
            console.error('Error parsing docx/text content:', error);
            // Fallback to trying to read as blob text
            const content = await blob.text();
            return content;
          }
        }

        // For text files, just read as text
        const content = await blob.text();
        return content;
      } catch (error) {
        console.error('Error fetching file content:', error);
        toast({
          title: 'Failed to load file',
          description: 'Could not load the file content',
          variant: 'destructive',
        });
        return null;
      }
    },
    [toast],
  );

  // Update an existing markdown file
  const updateMarkdownFile = useCallback(
    async (
      fileId: string,
      content: string,
      originalFileName?: string,
    ): Promise<{ success: boolean; file?: MindspaceDocument }> => {
      // Check for empty content
      if (!content || content.trim().length === 0) {
        toast({
          title: 'Cannot save empty file',
          description: 'Please add some content before saving',
          variant: 'destructive',
        });
        return { success: false };
      }

      if (workspacesLoading) {
        toast({
          title: 'Initializing...',
          description: 'Please wait while we connect to your workspace.',
        });
        return { success: false };
      }

      if (!currentWorkspace?.id || !selectedProject?.id) {
        toast({
          title: 'Missing context',
          description: 'Please select a workspace and project first',
          variant: 'destructive',
        });
        return { success: false };
      }

      try {
        // Check if this is a Word document being edited
        const isWordDocument =
          originalFileName?.endsWith('.docx') ||
          originalFileName?.endsWith('.doc');

        // Call the update-mindspace-file edge function
        const { data, error } =
          await supabase.functions.invoke<UpdateMindspaceFileResponse>(
            'update-mindspace-file',
            {
              body: {
                file_id: fileId,
                content,
              },
            },
          );

        if (error) {
          console.error('Error updating markdown file:', error);
          toast({
            title: 'Failed to update file',
            description:
              error.message || 'An error occurred while saving the file',
            variant: 'destructive',
          });
          return { success: false };
        }

        if (data?.success && data.file) {
          toast({
            title: 'File updated',
            description: isWordDocument
              ? 'Your changes have been saved as plain text. Note: Word document formatting has been converted to plain text.'
              : 'Your changes have been saved',
          });

          // Update the document in local state
          const updatedFile: MindspaceDocument = {
            id: data.file.id,
            fileName: data.file.file_name,
            fileSize: formatFileSize(data.file.file_size),
            fileType: getFileTypeFromExtension(data.file.file_name),
            mimeType: data.file.mime_type,
            isUploaded: true,
            uploadProgress: 100,
            createdAt: data.file.updated_at,
            signedUrl: data.file.signed_url,
            createdInEditor: true,
          };

          // Update local state with the updated file
          setDocuments((prev) =>
            prev.map((doc) =>
              doc.id === fileId
                ? {
                    ...updatedFile,
                    categoryId: doc.categoryId,
                    belongsToStage: doc.belongsToStage, // Preserve belongsToStage as it's not returned by update API
                  }
                : doc,
            ),
          );

          return { success: true, file: updatedFile };
        } else {
          toast({
            title: 'Failed to update file',
            description: data?.error || 'An unknown error occurred',
            variant: 'destructive',
          });
          return { success: false };
        }
      } catch (error) {
        console.error('Error updating markdown file:', error);
        toast({
          title: 'Failed to update file',
          description:
            error instanceof Error
              ? error.message
              : 'An unexpected error occurred',
          variant: 'destructive',
        });
        return { success: false };
      }
    },
    [currentWorkspace?.id, selectedProject?.id, toast, workspacesLoading],
  );

  // Delete a mindspace file
  const deleteDocument = useCallback(
    async (fileId: string): Promise<boolean> => {
      try {
        const { data, error } =
          await supabase.functions.invoke<DeleteMindspaceFileResponse>(
            'delete-mindspace-file',
            {
              body: {
                file_id: fileId,
              },
            },
          );

        if (error) {
          console.error('Error deleting file:', error);
          toast({
            title: 'Failed to delete file',
            description:
              error.message || 'An error occurred while deleting the file',
            variant: 'destructive',
          });
          return false;
        }

        if (data?.success) {
          toast({
            title: 'File deleted',
            description: `${
              data.file?.file_name || 'File'
            } has been deleted successfully`,
          });

          // Return true to indicate successful deletion
          // Note: We don't remove from state or refresh here - animation will handle removal
          return true;
        } else {
          toast({
            title: 'Failed to delete file',
            description: data?.error || 'An unknown error occurred',
            variant: 'destructive',
          });
          return false;
        }
      } catch (error) {
        console.error('Error deleting file:', error);
        toast({
          title: 'Failed to delete file',
          description:
            error instanceof Error
              ? error.message
              : 'An unexpected error occurred',
          variant: 'destructive',
        });
        return false;
      }
    },
    [toast],
  );

  // Bulk delete multiple mindspace files
  const bulkDeleteDocuments = useCallback(
    async (
      fileIds: (string | number)[],
    ): Promise<{ success: boolean; deletedIds: string[] }> => {
      if (fileIds.length === 0) {
        return { success: true, deletedIds: [] };
      }

      const stringFileIds = fileIds.map((id) => id.toString());

      try {
        const { data, error } =
          await supabase.functions.invoke<BulkDeleteMindspaceFileResponse>(
            'delete-mindspace-file',
            {
              body: {
                file_ids: stringFileIds,
              },
            },
          );

        if (error) {
          console.error('Error bulk deleting files:', error);
          toast({
            title: 'Failed to delete files',
            description:
              error.message || 'An error occurred while deleting the files',
            variant: 'destructive',
          });
          return { success: false, deletedIds: [] };
        }

        if (data && data.results) {
          const deletedIds = data.results
            .filter((r) => r.success)
            .map((r) => r.id);

          if (data.success_count > 0) {
            toast({
              title: 'Files deleted',
              description: data.message,
            });
          }

          if (data.failure_count > 0 && data.success_count > 0) {
            toast({
              title: 'Some files could not be deleted',
              description: `${data.failure_count} file(s) failed to delete`,
              variant: 'destructive',
            });
          } else if (data.failure_count > 0 && data.success_count === 0) {
            toast({
              title: 'Failed to delete files',
              description: 'None of the selected files could be deleted',
              variant: 'destructive',
            });
          }

          return { success: data.success, deletedIds };
        }

        return { success: false, deletedIds: [] };
      } catch (error) {
        console.error('Error bulk deleting files:', error);
        toast({
          title: 'Failed to delete files',
          description:
            error instanceof Error
              ? error.message
              : 'An unexpected error occurred',
          variant: 'destructive',
        });
        return { success: false, deletedIds: [] };
      }
    },
    [toast],
  );

  // Bulk download multiple mindspace files as a ZIP
  const bulkDownloadDocuments = useCallback(
    async (fileIds: (string | number)[]): Promise<boolean> => {
      if (fileIds.length === 0) {
        return false;
      }

      const stringFileIds = fileIds.map((id) => id.toString());

      try {
        // Get the current session for authorization
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.access_token) {
          toast({
            title: 'Authentication required',
            description: 'Please log in to download files',
            variant: 'destructive',
          });
          return false;
        }

        // Use fetch directly to handle binary response properly
        const response = await fetch(
          `${
            import.meta.env.VITE_SUPABASE_URL
          }/functions/v1/download-mindspace-files`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              file_ids: stringFileIds,
            }),
          },
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('Error bulk downloading files:', errorData);
          toast({
            title: 'Failed to download files',
            description:
              errorData.error ||
              'An error occurred while downloading the files',
            variant: 'destructive',
          });
          return false;
        }

        // Get the blob from the response
        const blob = await response.blob();

        if (blob && blob.size > 0) {
          // Create download link
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;

          // Extract filename from Content-Disposition header if available
          const contentDisposition = response.headers.get(
            'Content-Disposition',
          );
          let filename = `mindspace_${
            new Date().toISOString().split('T')[0]
          }.zip`; // Default fallback

          if (contentDisposition) {
            const filenameMatch =
              contentDisposition.match(/filename="?(.+?)"?$/);
            if (filenameMatch && filenameMatch[1]) {
              filename = filenameMatch[1];
            }
          }

          a.download = filename;

          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);

          toast({
            title: 'Download complete',
            description: `${stringFileIds.length} file(s) downloaded successfully`,
          });

          return true;
        } else {
          toast({
            title: 'Failed to download files',
            description: 'The download returned empty data',
            variant: 'destructive',
          });
          return false;
        }
      } catch (error) {
        console.error('Error bulk downloading files:', error);
        toast({
          title: 'Failed to download files',
          description:
            error instanceof Error
              ? error.message
              : 'An unexpected error occurred',
          variant: 'destructive',
        });
        return false;
      }
    },
    [toast],
  );

  // Remove document from state (used after animation completes)
  const removeDocumentFromState = useCallback((fileId: string) => {
    setDocuments((prev) => prev.filter((doc) => doc.id !== fileId));
  }, []);

  return {
    documents,
    isUploading,
    isLoading,
    fileInputRef,
    handleFileSelect,
    triggerFileSelect,
    removeDocument,
    uploadDocument,
    uploadAllDocuments,
    fetchDocuments,
    createMarkdownFile,
    updateMarkdownFile,
    fetchFileContent,
    isFileEditable,
    deleteDocument,
    bulkDeleteDocuments,
    bulkDownloadDocuments,
    removeDocumentFromState,
  };
};
