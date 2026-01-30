import { FileAttachment } from '@/hooks/useDragAndDrop';
import { supabase } from '@/integrations/supabase/client';

interface UploadChatFilesResult {
  fileKeys: string[];
  bucketName: string;
}

interface UploadResponse {
  success: boolean;
  message: string;
  file: {
    id: string;
    file_name: string;
    file_path: string; // This is the key
    file_size: number;
    mime_type: string;
    created_at: string;
    bucket_name: string;
    signed_url?: string;
  };
  error?: string;
}

export const uploadChatFiles = async (
  files: FileAttachment[],
  workspaceId: string,
  projectId: string,
): Promise<UploadChatFilesResult> => {
  if (!files || files.length === 0) {
    return { fileKeys: [], bucketName: '' };
  }

  const fileKeys: string[] = [];
  let bucketName = '';

  for (const fileAttachment of files) {
    const file = fileAttachment.file;
    if (!file) continue;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('workspace_id', workspaceId);
    formData.append('project_id', projectId);
    // Optional: category_id can be passed if needed, defaulting to what the edge function uses (likely 1 for All or generic)

    const { data, error } = await supabase.functions.invoke<UploadResponse>(
      'upload-mindspace-file',
      {
        body: formData,
      },
    );

    if (error) {
      console.error('Error invoking upload-mindspace-file:', error);
      throw new Error(`Failed to upload file ${file.name}: ${error.message}`);
    }

    if (!data?.success || !data.file) {
      console.error('Upload failed with response:', data);
      throw new Error(
        `Failed to upload file ${file.name}: ${data?.error || 'Unknown error'}`,
      );
    }

    fileKeys.push(data.file.file_path);

    // Assume all files go to the same bucket for the user/project/workspace combination
    if (!bucketName) {
      bucketName = data.file.bucket_name;
    }
  }

  return { fileKeys, bucketName };
};
