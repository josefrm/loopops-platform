import { ModelCapabilities } from '@/hooks/useModelCapabilities';
import { ModelCapabilitiesService } from '@/services/ModelCapabilitiesService';
import { formatFileSize, getFileExtension } from './fileUtils';

/**
 * Blocked executable file extensions for security
 */
const BLOCKED_EXTENSIONS = [
  '.exe',
  '.bat',
  '.cmd',
  '.com',
  '.msi',
  '.sh',
  '.bash',
  '.zsh',
  '.ps1',
  '.app',
  '.deb',
  '.rpm',
  '.dmg',
  '.pkg',
  '.bin',
  '.run',
  '.scr',
  '.vbs',
  '.js', // Block standalone JS to prevent execution
  '.jar',
  '.apk',
  '.ipa',
];

/**
 * Suspicious MIME types that should be blocked
 */
const BLOCKED_MIME_TYPES = [
  'application/x-msdownload',
  'application/x-sh',
  'application/x-executable',
  'application/x-msdos-program',
  'application/x-bat',
  'text/x-shellscript',
  'application/x-apple-diskimage',
  'application/vnd.microsoft.portable-executable',
];

/**
 * System-wide maximum file size (25MB)
 */
export const SYSTEM_MAX_FILE_SIZE_MB = 30;
export const SYSTEM_MAX_FILE_SIZE_BYTES = SYSTEM_MAX_FILE_SIZE_MB * 1024 * 1024;

/**
 * System-wide maximum number of files per upload
 */
export const SYSTEM_MAX_FILES = 10;

/**
 * Validation error types
 */
export enum FileValidationErrorType {
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  UNSUPPORTED_TYPE = 'UNSUPPORTED_TYPE',
  EXECUTABLE_BLOCKED = 'EXECUTABLE_BLOCKED',
  MODEL_DOES_NOT_SUPPORT = 'MODEL_DOES_NOT_SUPPORT',
  MIME_TYPE_MISMATCH = 'MIME_TYPE_MISMATCH',
}

/**
 * Validation error result
 */
export interface FileValidationError {
  type: FileValidationErrorType;
  message: string;
  details?: {
    fileName?: string;
    fileSize?: number;
    maxSize?: number;
    mimeType?: string;
    extension?: string;
  };
}

/**
 * Result of file validation
 */
export interface FileValidationResult {
  isValid: boolean;
  error?: FileValidationError;
}

/**
 * File upload validation service with model-awareness and security checks
 */
export class FileUploadValidation {
  /**
   * Validate a file against model capabilities and security rules
   * @param file - The file to validate
   * @param modelCapabilities - Model capabilities (null if no model selected)
   * @returns Validation result
   */
  static validateFile(
    file: File,
    modelCapabilities: ModelCapabilities | null,
  ): FileValidationResult {
    // 1. Check if model supports file uploads at all
    if (!modelCapabilities || !modelCapabilities.supportsFileUpload) {
      return {
        isValid: false,
        error: {
          type: FileValidationErrorType.MODEL_DOES_NOT_SUPPORT,
          message: 'The current AI model does not support file uploads',
          details: { fileName: file.name },
        },
      };
    }

    // 2. Security check: Block executable files
    const executableCheck = this.checkForExecutable(file);
    if (!executableCheck.isValid) {
      return executableCheck;
    }

    // 3. File size validation (model limit AND system limit)
    const sizeCheck = this.validateFileSize(file, modelCapabilities);
    if (!sizeCheck.isValid) {
      return sizeCheck;
    }

    // 4. MIME type validation against model's allowed types usando el servicio
    if (
      !ModelCapabilitiesService.isFileSupportedByModel(file, modelCapabilities)
    ) {
      const errorMessage = ModelCapabilitiesService.getUnsupportedFileMessage(
        file,
        modelCapabilities,
      );
      return {
        isValid: false,
        error: {
          type: FileValidationErrorType.UNSUPPORTED_TYPE,
          message: errorMessage,
          details: {
            fileName: file.name,
            mimeType: file.type,
          },
        },
      };
    }

    return { isValid: true };
  }

  /**
   * Check if file is an executable or has suspicious extension
   * @param file - The file to check
   * @returns Validation result
   */
  private static checkForExecutable(file: File): FileValidationResult {
    const extension = this.getFileExtension(file.name);

    // Check extension
    if (BLOCKED_EXTENSIONS.includes(extension.toLowerCase())) {
      return {
        isValid: false,
        error: {
          type: FileValidationErrorType.EXECUTABLE_BLOCKED,
          message: `Executable files (${extension}) are not allowed for security reasons`,
          details: {
            fileName: file.name,
            extension,
          },
        },
      };
    }

    // Check MIME type
    if (BLOCKED_MIME_TYPES.includes(file.type)) {
      return {
        isValid: false,
        error: {
          type: FileValidationErrorType.EXECUTABLE_BLOCKED,
          message: 'This file type is blocked for security reasons',
          details: {
            fileName: file.name,
            mimeType: file.type,
          },
        },
      };
    }

    return { isValid: true };
  }

  /**
   * Validate file size against model and system limits
   * @param file - The file to validate
   * @param modelCapabilities - Model capabilities
   * @returns Validation result
   */
  private static validateFileSize(
    file: File,
    modelCapabilities: ModelCapabilities,
  ): FileValidationResult {
    const modelMaxBytes = modelCapabilities.maxFileSizeMB * 1024 * 1024;
    const effectiveMaxBytes = Math.min(
      modelMaxBytes,
      SYSTEM_MAX_FILE_SIZE_BYTES,
    );
    const effectiveMaxMB = Math.min(
      modelCapabilities.maxFileSizeMB,
      SYSTEM_MAX_FILE_SIZE_MB,
    );

    if (file.size > effectiveMaxBytes) {
      return {
        isValid: false,
        error: {
          type: FileValidationErrorType.FILE_TOO_LARGE,
          message: `File is too large. Maximum size is ${effectiveMaxMB}MB`,
          details: {
            fileName: file.name,
            fileSize: file.size,
            maxSize: effectiveMaxBytes,
          },
        },
      };
    }

    return { isValid: true };
  }

  /**
   * Validate file MIME type against model's allowed types
   * @param file - The file to validate
   * @param modelCapabilities - Model capabilities
   * @returns Validation result
   */
  private static validateMimeType(
    file: File,
    modelCapabilities: ModelCapabilities,
  ): FileValidationResult {
    const allowedMimeTypes = modelCapabilities.allowedMimeTypes;

    if (allowedMimeTypes.length === 0) {
      return { isValid: true }; // No restrictions
    }

    // Check if file MIME type matches any allowed type
    const isAllowed = allowedMimeTypes.some((allowedType) => {
      // Support wildcards (e.g., "image/*")
      if (allowedType.includes('*')) {
        const baseType = allowedType.split('/')[0];
        return file.type.startsWith(baseType + '/');
      }
      return file.type === allowedType;
    });

    if (!isAllowed) {
      return {
        isValid: false,
        error: {
          type: FileValidationErrorType.UNSUPPORTED_TYPE,
          message: `File type ${
            file.type || 'unknown'
          } is not supported by this model`,
          details: {
            fileName: file.name,
            mimeType: file.type,
          },
        },
      };
    }

    return { isValid: true };
  }

  /**
   * Get file extension including the dot
   * @param fileName - The file name
   * @returns Extension (e.g., ".pdf")
   */
  private static getFileExtension(fileName: string): string {
    return getFileExtension(fileName);
  }

  /**
   * Format file size in human-readable format
   * @param bytes - File size in bytes
   * @returns Formatted size (e.g., "5.2 MB")
   */
  static formatFileSize(bytes: number): string {
    return formatFileSize(bytes);
  }

  /**
   * Get user-friendly error message
   * @param error - Validation error
   * @returns User-friendly message
   */
  static getUserFriendlyMessage(error: FileValidationError): string {
    switch (error.type) {
      case FileValidationErrorType.FILE_TOO_LARGE:
        return `${
          error.details?.fileName
        } is too large. Maximum allowed size is ${
          error.details?.maxSize
            ? formatFileSize(error.details.maxSize)
            : '25MB'
        }`;

      case FileValidationErrorType.EXECUTABLE_BLOCKED:
        return `${error.details?.fileName} cannot be uploaded. Executable files are blocked for security.`;

      case FileValidationErrorType.UNSUPPORTED_TYPE:
        return `${error.details?.fileName} has an unsupported file type. Please select a compatible file.`;

      case FileValidationErrorType.MODEL_DOES_NOT_SUPPORT:
        return 'The current AI model does not support file uploads. Please select a model that supports files.';

      case FileValidationErrorType.MIME_TYPE_MISMATCH:
        return `${error.details?.fileName} appears to be a different file type than its extension suggests.`;

      default:
        return error.message;
    }
  }
}
