import { FileAttachment } from '@/hooks/useDragAndDrop';
import { downloadFileFromUrl } from './fileDownloadUtils';

// Maximum file size for immediate download (10MB)
const MAX_IMMEDIATE_DOWNLOAD_SIZE = 10 * 1024 * 1024;

/**
 * Converts a Mindspace file reference to a FileAttachment
 * For large files, delays download until needed
 */
export const convertMindspaceFileToAttachment = async (
  fileId: string,
  fileName: string,
  signedUrl: string,
  fileSize?: number,
  fileType?: string,
): Promise<FileAttachment> => {
  try {
    // For small files or when size is unknown, download immediately
    // For large files, create attachment without downloading yet
    const shouldDownloadNow = !fileSize || fileSize <= MAX_IMMEDIATE_DOWNLOAD_SIZE;
    
    let file: File | undefined;
    
    if (shouldDownloadNow) {
      file = await downloadFileFromUrl(signedUrl, fileName, fileType);
    }

    return {
      id: fileId,
      name: fileName,
      size: fileSize || file?.size || 0,
      type: fileType || file?.type || 'application/octet-stream',
      file: file,
      uploadStatus: 'pending',
      url: signedUrl,
      mindspaceFileId: fileId,
      isMindspaceReference: true,
    };
  } catch (error) {
    console.error('Error converting Mindspace file to attachment:', error);
    throw new Error(`Failed to load file: ${fileName}`);
  }
};

/**
 * Converts a File object to a FileAttachment
 */
export const convertFileToAttachment = (file: File): FileAttachment => {
  return {
    id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: file.name,
    size: file.size,
    type: file.type,
    file: file,
    uploadStatus: 'pending',
  };
};

/**
 * Converts an array of Files to FileAttachments
 */
export const convertFilesToAttachments = (files: File[]): FileAttachment[] => {
  return files.map(convertFileToAttachment);
};

/**
 * Interface for passing file data between routes
 */
export interface RouteFileData {
  fileId: string;
  fileName: string;
  signedUrl: string;
  fileSize?: number;
  fileType?: string;
  isMindspaceFile?: boolean;
}

/**
 * Downloads a file attachment that was deferred
 */
export const downloadDeferredFile = async (
  attachment: FileAttachment,
): Promise<File> => {
  if (attachment.file) {
    return attachment.file;
  }

  if (!attachment.url) {
    throw new Error(`No URL available for file: ${attachment.name}`);
  }

  return await downloadFileFromUrl(
    attachment.url,
    attachment.name,
    attachment.type,
  );
};

/**
 * Converts route file data to FileAttachments
 * This is useful for passing files between pages via React Router state
 * Large files are not downloaded immediately
 */
export const convertRouteFilesToAttachments = async (
  routeFiles: RouteFileData[],
  onProgress?: (fileName: string, loaded: number, total: number) => void,
): Promise<FileAttachment[]> => {
  const attachments: FileAttachment[] = [];

  for (const routeFile of routeFiles) {
    try {
      if (routeFile.isMindspaceFile) {
        const attachment = await convertMindspaceFileToAttachment(
          routeFile.fileId,
          routeFile.fileName,
          routeFile.signedUrl,
          routeFile.fileSize,
          routeFile.fileType,
        );
        attachments.push(attachment);
      } else {
        // For regular files, check size before downloading
        const shouldDownloadNow = !routeFile.fileSize || 
          routeFile.fileSize <= MAX_IMMEDIATE_DOWNLOAD_SIZE;
        
        let file: File | undefined;
        
        if (shouldDownloadNow) {
          file = await downloadFileFromUrl(
            routeFile.signedUrl,
            routeFile.fileName,
            routeFile.fileType,
          );
        }
        
        attachments.push({
          id: routeFile.fileId,
          name: routeFile.fileName,
          size: routeFile.fileSize || file?.size || 0,
          type: routeFile.fileType || file?.type || 'application/octet-stream',
          file: file,
          uploadStatus: 'pending',
          url: routeFile.signedUrl,
        });
      }
      
      onProgress?.(
        routeFile.fileName,
        attachments.length,
        routeFiles.length,
      );
    } catch (error) {
      console.error(
        `Error converting route file ${routeFile.fileName}:`,
        error,
      );
      // Continue with other files even if one fails
    }
  }

  return attachments;
};
