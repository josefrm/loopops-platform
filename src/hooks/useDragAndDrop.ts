import { ModelCapabilities } from '@/hooks/useModelCapabilities';
import { downloadFileFromUrl } from '@/utils/fileDownloadUtils';
import {
  FileUploadValidation,
  SYSTEM_MAX_FILE_SIZE_BYTES,
  SYSTEM_MAX_FILES,
} from '@/utils/fileUploadValidation';
import { DragEvent, useCallback, useState } from 'react';

export interface FileAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  file?: File;
  uploadStatus: 'pending' | 'uploading' | 'uploaded' | 'vectorized' | 'error';
  url?: string;
  error?: string;
  mindspaceFileId?: string;
  isMindspaceReference?: boolean;
}

export interface UseDragAndDropOptions {
  onFilesAdded: (files: FileAttachment[]) => void;
  onError?: (error: string) => void;
  maxFileSize?: number;
  allowedTypes?: string[];
  maxFiles?: number;
  modelCapabilities?: ModelCapabilities | null;
}

export const useDragAndDrop = ({
  onFilesAdded,
  onError,
  maxFileSize = SYSTEM_MAX_FILE_SIZE_BYTES,
  allowedTypes = [
    'image/*',
    'text/*',
    '.pdf',
    '.doc',
    '.docx',
    '.xls',
    '.xlsx',
  ], // Legacy, overridden by model capabilities
  maxFiles = SYSTEM_MAX_FILES,
  modelCapabilities = null,
}: UseDragAndDropOptions) => {
  const [isDragOver, setIsDragOver] = useState(false);

  const validateFile = useCallback(
    (file: File): string | null => {
      if (!modelCapabilities) {
        return 'Model capabilities not available. Cannot validate file uploads.';
      }

      if (modelCapabilities) {
        const result = FileUploadValidation.validateFile(
          file,
          modelCapabilities,
        );
        if (!result.isValid && result.error) {
          return FileUploadValidation.getUserFriendlyMessage(result.error);
        }
        return null;
      }

      if (file.size > maxFileSize) {
        return `File ${file.name} is too large. Maximum size is ${Math.round(
          maxFileSize / (1024 * 1024),
        )}MB`;
      }

      const isValidType = allowedTypes.some((type) => {
        if (type.includes('*')) {
          const baseType = type.split('/')[0];
          return file.type.startsWith(baseType);
        }
        return type === file.type || file.name.toLowerCase().endsWith(type);
      });

      if (!isValidType) {
        return `File type ${file.type} is not supported`;
      }

      return null;
    },
    [maxFileSize, allowedTypes, modelCapabilities],
  );

  const processFiles = useCallback(
    (files: FileList | File[]) => {
      if (!modelCapabilities) {
        onError?.(
          'Model capabilities not available. Cannot accept file uploads.',
        );
        return;
      }

      const fileArray = Array.from(files);

      if (fileArray.length > maxFiles) {
        onError?.(`Too many files. Maximum ${maxFiles} files allowed.`);
        return;
      }

      const validFiles: FileAttachment[] = [];
      const errors: string[] = [];

      fileArray.forEach((file) => {
        const error = validateFile(file);
        if (error) {
          errors.push(error);
        } else {
          validFiles.push({
            id: crypto.randomUUID(),
            name: file.name,
            size: file.size,
            type: file.type,
            file,
            uploadStatus: 'pending',
            url: URL.createObjectURL(file),
          });
        }
      });

      if (errors.length > 0) {
        onError?.(errors.join('\n'));
      }

      if (validFiles.length > 0) {
        onFilesAdded(validFiles);
      }
    },
    [maxFiles, validateFile, onFilesAdded, onError, modelCapabilities],
  );

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleMindspaceFileDrop = useCallback(
    async (dragData: any): Promise<void> => {
      if (!modelCapabilities) {
        onError?.(
          'Model capabilities not available. Cannot accept file uploads.',
        );
        return;
      }

      try {
        const file = await downloadFileFromUrl(
          dragData.signedUrl,
          dragData.fileName,
          dragData.mimeType,
        );

        const validationError = validateFile(file);
        if (validationError) {
          onError?.(validationError);
          return;
        }

        const mindspaceFileAttachment: FileAttachment = {
          id: dragData.id,
          name: file.name,
          size: file.size,
          type: file.type,
          file: file,
          uploadStatus: 'uploaded',
          url: URL.createObjectURL(file),
          mindspaceFileId: dragData.id,
          isMindspaceReference: false,
        };

        onFilesAdded([mindspaceFileAttachment]);
      } catch (error) {
        console.error('Error downloading Mindspace file:', error);
        onError?.('Failed to download file from Mindspace');
      }
    },
    [onFilesAdded, onError, modelCapabilities, validateFile],
  );

  const handleDrop = useCallback(
    async (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      try {
        const jsonData = e.dataTransfer.getData('application/json');
        if (jsonData) {
          const dragData = JSON.parse(jsonData);
          if (
            dragData.type === 'mindspace-file' &&
            dragData.id &&
            dragData.signedUrl
          ) {
            await handleMindspaceFileDrop(dragData);
            return;
          }
        }
      } catch (error) {
        console.error('Error parsing drag data:', error);
      }

      const { files } = e.dataTransfer;
      if (files && files.length > 0) {
        processFiles(files);
      }
    },
    [processFiles, handleMindspaceFileDrop],
  );

  const handleFileInput = useCallback(
    (files: FileList | null) => {
      if (files && files.length > 0) {
        processFiles(files);
      }
    },
    [processFiles],
  );

  return {
    isDragOver,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleFileInput,
    validateFile,
  };
};
