export interface ProjectContextDocument {
  id: string;
  fileName: string;
  fileSize: string;
  fileType: string;
  mimeType?: string;
  file?: File;
  uploadProgress?: number;
  isUploaded: boolean;
  createdAt?: string;
  signedUrl?: string;
  stageId: string;
  // Storage metadata for knowledge base processing
  storagePath?: string;
  bucketName?: string;
  isDeliverable?: boolean;
  // Extracted metadata
  summary?: string;
  tags?: string[];
  category?: string;
}

export interface UploadProjectContextFileResponse {
  success: boolean;
  stage_file_id: string;
  message: string;
  file: {
    id: string;
    file_name: string;
    file_path: string;
    file_size: number;
    mime_type: string;
    created_at: string;
    bucket_name: string;
    signed_url?: string;
  };
  // Extracted metadata from the document
  metadata?: {
    summary: string;
    tags: string[];
    category: string;
  };
}
