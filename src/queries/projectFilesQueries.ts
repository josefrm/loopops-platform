import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// Types
interface ProjectFile {
  id: string;
  file_name: string;
  signed_url: string;
  mime_type: string;
  file_size?: number;
  file_type?: string;
}

interface GetProjectFilesParams {
  file_ids: string[];
}

interface DownloadSingleProjectFileParams {
  file_id: string;
}

interface BulkDownloadProjectFilesParams {
  file_ids: string[];
}

interface DeleteProjectFilesParams {
  file_ids: string[];
}

// Query Keys
export const projectFilesKeys = {
  all: ['project-files'] as const,
  files: (fileIds: string[]) =>
    [...projectFilesKeys.all, 'files', fileIds] as const,
};

// Fetch project files details
export const fetchProjectFiles = async (
  params: GetProjectFilesParams,
): Promise<{ files: ProjectFile[] }> => {
  const { data: projectFiles, error: filesError } = await supabase
    .from('loopops_project_files')
    .select(
      'id, file_name, mime_type, file_path, loopops_project_buckets(bucket_name)',
    )
    .in('id', params.file_ids);

  if (filesError) {
    console.error('Error fetching project files:', filesError);
    throw new Error(filesError.message || 'Failed to fetch project files');
  }

  if (!projectFiles || projectFiles.length === 0) {
    console.warn('No project files found for IDs:', params.file_ids);
    return { files: [] };
  }

  // Check which files were found vs requested
  const foundIds = projectFiles.map((f: any) => f.id);
  const missingIds = params.file_ids.filter((id) => !foundIds.includes(id));

  if (missingIds.length > 0) {
    console.warn('Some files not found in database:', missingIds);
  }

  // Generate signed URLs for each file
  const filesWithUrls = await Promise.all(
    projectFiles.map(async (file: any) => {
      const bucketName =
        file.loopops_project_buckets?.bucket_name || 'project-files';

      const { data: signedUrlData, error: urlError } = await supabase.storage
        .from(bucketName)
        .createSignedUrl(file.file_path, 3600); // 1 hour expiry

      if (urlError || !signedUrlData?.signedUrl) {
        console.error(
          `Error generating signed URL for file ${file.id} (${file.file_name}):`,
          urlError,
        );
        return null;
      }

      return {
        id: file.id,
        file_name: file.file_name,
        mime_type: file.mime_type,
        signed_url: signedUrlData.signedUrl,
      };
    }),
  );

  // Filter out any null results (failed URL generations)
  const validFiles = filesWithUrls.filter(
    (file) => file !== null,
  ) as ProjectFile[];

  if (validFiles.length === 0 && params.file_ids.length > 0) {
    throw new Error(
      'No valid signed URLs could be generated for the requested files',
    );
  }

  return { files: validFiles };
};

// Download a single project file
const downloadSingleProjectFile = async (
  params: DownloadSingleProjectFileParams,
): Promise<{ blob: Blob; fileName: string }> => {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('No active session found');
  }

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/download-project-files`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    },
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.error || 'Failed to download file');
  }

  // Get file name from header or use default
  const fileName = response.headers.get('X-File-Name') || 'download';
  const blob = await response.blob();

  return { blob, fileName };
};

// Bulk download project files as ZIP
const bulkDownloadProjectFiles = async (
  params: BulkDownloadProjectFilesParams,
): Promise<Blob> => {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('No active session found');
  }

  const response = await fetch(
    `${
      import.meta.env.VITE_SUPABASE_URL
    }/functions/v1/bulk-download-project-files`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    },
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.error || 'Failed to download files');
  }

  return response.blob();
};

// Unified download function that handles both single and bulk downloads
const downloadProjectFiles = async (
  params: BulkDownloadProjectFilesParams,
): Promise<{ blob: Blob; fileName: string; isSingle: boolean }> => {
  if (params.file_ids.length === 1) {
    // Single file download
    const result = await downloadSingleProjectFile({
      file_id: params.file_ids[0],
    });
    return { ...result, isSingle: true };
  } else {
    // Bulk download as ZIP
    const blob = await bulkDownloadProjectFiles(params);
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    return { blob, fileName: `project_files_${dateStr}.zip`, isSingle: false };
  }
};

// Delete project files
const deleteProjectFiles = async (params: DeleteProjectFilesParams) => {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('No active session found');
  }

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-project-files`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    },
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || 'Failed to delete files');
  }

  return result;
};

// Hooks

/**
 * Query hook to get project files details
 * Uses cache to avoid redundant fetches for the same file IDs
 */
export const useGetProjectFiles = (fileIds: string[], enabled = true) => {
  return useQuery({
    queryKey: projectFilesKeys.files(fileIds),
    queryFn: () => fetchProjectFiles({ file_ids: fileIds }),
    enabled: enabled && fileIds.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
  });
};

/**
 * Mutation hook to download project files
 * Handles both single file and bulk downloads automatically
 */
export const useDownloadProjectFiles = () => {
  return useMutation({
    mutationFn: downloadProjectFiles,
  });
};

/**
 * Mutation hook to download a single project file
 */
export const useDownloadSingleProjectFile = () => {
  return useMutation({
    mutationFn: downloadSingleProjectFile,
  });
};

/**
 * Mutation hook to bulk download project files as ZIP
 */
export const useBulkDownloadProjectFiles = () => {
  return useMutation({
    mutationFn: bulkDownloadProjectFiles,
  });
};

/**
 * Mutation hook to delete project files
 * Invalidates relevant queries after successful deletion
 */
export const useDeleteProjectFiles = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteProjectFiles,
    onSuccess: () => {
      // Invalidate all project files queries to refetch updated data
      queryClient.invalidateQueries({ queryKey: projectFilesKeys.all });
    },
  });
};
