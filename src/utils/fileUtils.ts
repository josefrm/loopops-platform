/**
 * File Utilities - Single source of truth for file-related operations
 *
 * This module provides centralized utilities for:
 * - File size formatting
 * - File type detection from MIME types
 * - File type detection from filenames
 * - Content type validation
 */

/**
 * Format file size in human-readable format
 * @param bytes - File size in bytes
 * @returns Formatted size (e.g., "5.2 MB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

/**
 * Get file extension from filename (including the dot)
 * @param fileName - The file name
 * @returns Extension (e.g., ".pdf") or empty string
 */
export function getFileExtension(fileName: string): string {
  const parts = fileName.split('.');
  if (parts.length < 2) return '';
  return '.' + parts[parts.length - 1];
}

/**
 * Get file extension without the dot
 * @param fileName - The file name
 * @returns Extension (e.g., "pdf") or empty string
 */
export function getFileExtensionWithoutDot(fileName: string): string {
  const ext = getFileExtension(fileName);
  return ext ? ext.slice(1) : '';
}

/**
 * Get file type from MIME type
 * Returns simplified type categories for UI purposes
 * @param mimeType - The MIME type
 * @returns File type category (image, pdf, document, text, file)
 */
export function getFileTypeFromMimeType(mimeType: string): string {
  if (!mimeType) return 'file';

  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType.includes('word') || mimeType.includes('document'))
    return 'document';
  if (mimeType.startsWith('text/') || mimeType === 'text/markdown')
    return 'text';
  return 'file';
}

/**
 * Get file type from filename extension
 * @param fileName - The file name
 * @returns File type category
 */
export function getFileTypeFromExtension(fileName: string): string {
  const extension = getFileExtensionWithoutDot(fileName).toLowerCase();

  switch (extension) {
    case 'pdf':
      return 'pdf';
    case 'doc':
    case 'docx':
      return 'document';
    case 'txt':
    case 'md':
      return 'text';
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'webp':
    case 'svg':
    case 'bmp':
      return 'image';
    default:
      return 'file';
  }
}

/**
 * Check if a file is an image based on content type and filename
 * @param contentType - The content type from HTTP headers
 * @param fileName - The file name
 * @returns True if file is an image
 */
export function isImageFile(contentType: string, fileName: string): boolean {
  const imageContentTypes = [
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'image/bmp',
    'image/x-icon',
  ];

  const imageExtensions = /\.(png|jpg|jpeg|gif|webp|svg|bmp|ico)$/i;

  return (
    imageContentTypes.some((type) => contentType.includes(type)) ||
    imageExtensions.test(fileName)
  );
}

/**
 * Check if a file is a PDF based on content type and filename
 * @param contentType - The content type from HTTP headers
 * @param fileName - The file name
 * @returns True if file is a PDF
 */
export function isPdfFile(contentType: string, fileName: string): boolean {
  return (
    contentType.includes('application/pdf') ||
    fileName.toLowerCase().endsWith('.pdf')
  );
}

/**
 * Check if a file is a text file based on content type and filename
 * @param contentType - The content type from HTTP headers
 * @param fileName - The file name
 * @returns True if file is a text file
 */
export function isTextFile(contentType: string, fileName: string): boolean {
  const textContentTypes = [
    'text/',
    'application/json',
    'application/javascript',
    'application/typescript',
    'application/xml',
    'application/xhtml+xml',
  ];

  const textExtensions =
    /\.(txt|md|json|js|jsx|ts|tsx|css|scss|sass|html|xml|svg|yaml|yml|csv|log|sh|bash|py|java|cpp|c|h|cs|php|rb|go|rs|swift|kt|sql)$/i;

  return (
    textContentTypes.some((type) => contentType.includes(type)) ||
    textExtensions.test(fileName)
  );
}

export function isDocxFile(contentType: string, fileName: string): boolean {
  return (
    contentType.includes('application/vnd.openxmlformats-officedocument.wordprocessingml') ||
    contentType.includes('application/msword') ||
    fileName.toLowerCase().endsWith('.docx')
  );
}

/**
 * Check if a file is an Excel spreadsheet (.xlsx, .xls) based on content type and filename
 * @param contentType - The content type from HTTP headers
 * @param fileName - The file name
 * @returns True if file is an Excel spreadsheet
 */
export function isExcelFile(contentType: string, fileName: string): boolean {
  return (
    contentType.includes('application/vnd.openxmlformats-officedocument.spreadsheetml') ||
    contentType.includes('application/vnd.ms-excel') ||
    fileName.toLowerCase().endsWith('.xlsx') ||
    fileName.toLowerCase().endsWith('.xls')
  );
}

/**
 * Check if a file is an Office document (.docx, .xlsx, .pptx)
 * @param contentType - The content type from HTTP headers
 * @param fileName - The file name
 * @returns True if file is an Office document
 */
export function isOfficeFile(contentType: string, fileName: string): boolean {
  return isDocxFile(contentType, fileName) || isExcelFile(contentType, fileName);
}

/**
 * Check if a file is editable (markdown, text, or Word document)
 * @param mimeType - The MIME type
 * @returns True if file can be edited in a text editor
 */
export function isFileEditable(mimeType?: string): boolean {
  if (!mimeType) return false;
  return (
    mimeType === 'text/markdown' ||
    mimeType === 'text/plain' ||
    mimeType.startsWith('text/') ||
    // Word documents (both .doc and .docx)
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mimeType === 'application/msword'
  );
}

/**
 * Generate file info markdown for display
 * @param fileName - The file name
 * @param fileSize - The file size in bytes
 * @param fileType - The file type/MIME type
 * @returns Markdown formatted file info
 */
export function generateFileInfoMarkdown(
  fileName: string,
  fileSize: number,
  fileType?: string,
): string {
  return `# ${fileName}

**Type:** ${fileType || 'Unknown'}

**Size:** ${formatFileSize(fileSize)}

---

*No preview available - file URL not provided*`;
}

/**
 * Generate binary file markdown for display
 * @param fileName - The file name
 * @param fileSize - The file size in bytes
 * @param fileType - The file type/MIME type
 * @returns Markdown formatted binary file info
 */
export function generateBinaryFileMarkdown(
  fileName: string,
  fileSize: number,
  fileType?: string,
): string {
  return `# ${fileName}

**File Type:** ${fileType || 'Unknown'}

**Size:** ${formatFileSize(fileSize)}

---

*Preview not available for this file type*

You can download this file using the export button.`;
}

/**
 * Generate error markdown for display
 * @param fileName - The file name
 * @param errorMessage - The error message
 * @returns Markdown formatted error message
 */
export function generateErrorMarkdown(
  fileName: string,
  errorMessage: string,
): string {
  return `# Error Loading File

**File:** ${fileName}

**Error:** ${errorMessage}

---

Please try again or contact support if the issue persists.`;
}
