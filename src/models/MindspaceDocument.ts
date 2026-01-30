import { formatFileSize, getFileTypeFromMimeType } from '@/utils/fileUtils';

/**
 * MindspaceFile - represents a file from the get-mindspace-files API response
 * This is the structure returned by the get-mindspace-files edge function
 */
export interface MindspaceFile {
  id: string;
  file_name: string;
  file_size: number; // bytes
  mime_type: string;
  signed_url: string;
  created_at: string;
  belongs_to_stage: boolean;
  created_in_editor: boolean;
  is_deliverable?: boolean;
  category_id: number;
}

/**
 * GetMindspaceFilesResponse - the full response from get-mindspace-files
 */
export interface GetMindspaceFilesResponse {
  files: MindspaceFile[];
  total_count: number;
  mindspace_bucket_id: string | null;
}

/**
 * MindspaceDocument - UI representation of a document in Mindspace
 * Used for rendering in the UI with formatted values
 */
export interface MindspaceDocument {
  id: string;
  fileName: string;
  fileSize: string; // Formatted string like "1.5 MB"
  fileType: string; // Derived from mime_type or extension
  mimeType?: string;
  signedUrl?: string;
  uploadProgress?: number;
  file?: File; // The actual file for upload (only used during upload)
  isUploaded?: boolean;
  createdAt?: string;
  belongsToStage?: boolean;
  createdInEditor?: boolean;
  isDeliverable?: boolean;
  categoryId?: number;
  // Storage metadata for knowledge base processing
  storagePath?: string;
  bucketName?: string;
}

/**
 * Helper function to convert MindspaceFile (API) to MindspaceDocument (UI)
 */
export const mindspaceFileToDocument = (
  file: MindspaceFile,
): MindspaceDocument => {
  return {
    id: file.id,
    fileName: file.file_name,
    fileSize: formatFileSize(file.file_size),
    fileType: getFileTypeFromMimeType(file.mime_type),
    mimeType: file.mime_type,
    signedUrl: file.signed_url,
    isUploaded: true,
    createdAt: file.created_at,
    belongsToStage: file.belongs_to_stage,
    createdInEditor: file.created_in_editor,
    isDeliverable: file.is_deliverable,
    categoryId: file.category_id,
  };
};

// Re-export utilities for backward compatibility
export { formatFileSize, getFileTypeFromMimeType } from '@/utils/fileUtils';
