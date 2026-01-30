import { supabase } from '@/integrations/supabase/client';
import {
  GetMindspaceFilesResponse,
  MindspaceDocument,
  mindspaceFileToDocument,
} from '@/models/MindspaceDocument';

export class MindspaceFilesService {
  static async getFiles(
    workspaceId: string,
    projectId: string,
  ): Promise<MindspaceDocument[]> {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      throw new Error('No active session found');
    }

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-mindspace-files`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
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
      throw new Error(errorData.error || 'Failed to fetch mindspace files');
    }

    const data: GetMindspaceFilesResponse = await response.json();
    const documents = data.files.map(mindspaceFileToDocument);

    documents.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });

    return documents;
  }

  static async getFileContent(fileId: string): Promise<string> {
    const { data: fileData, error: fileError } = await supabase
      .from('loopops_mindspace_files')
      .select(
        'file_path, mindspace_bucket_id, loopops_mindspace_buckets(bucket_name)',
      )
      .eq('id', fileId)
      .single();

    if (fileError || !fileData) {
      throw new Error('Failed to fetch file metadata');
    }

    const bucketName = (fileData as any).loopops_mindspace_buckets?.bucket_name;

    if (!bucketName) {
      throw new Error('Bucket name not found');
    }

    const { data: blob, error: downloadError } = await supabase.storage
      .from(bucketName)
      .download(fileData.file_path);

    if (downloadError || !blob) {
      throw new Error('Failed to download file');
    }

    return await blob.text();
  }
}
