import React from 'react';
import {
  FileText,
  FileImage,
  FileVideo,
  FileAudio,
  FileCode,
  FileSpreadsheet,
  File,
} from 'lucide-react';

export type FileIconType =
  | 'text'
  | 'image'
  | 'video'
  | 'audio'
  | 'code'
  | 'spreadsheet'
  | 'pdf'
  | 'document'
  | 'default';

interface FileIconProps {
  type?: FileIconType;
  mimeType?: string;
  fileName?: string;
  className?: string;
  size?: number;
}

/**
 * Factory function to determine file type from MIME type or filename
 */
export const getFileTypeFromMime = (
  mimeType?: string,
  fileName?: string,
): FileIconType => {
  if (!mimeType && !fileName) return 'default';

  if (mimeType) {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType.startsWith('text/')) return 'text';
    if (mimeType === 'application/pdf') return 'pdf';
    if (
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mimeType === 'application/msword'
    )
      return 'document';
    if (
      mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      mimeType === 'application/vnd.ms-excel'
    )
      return 'spreadsheet';
    if (
      mimeType === 'application/json' ||
      mimeType === 'application/javascript' ||
      mimeType === 'text/javascript' ||
      mimeType === 'text/html' ||
      mimeType === 'text/css'
    )
      return 'code';
  }

  if (fileName) {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'svg':
      case 'webp':
        return 'image';
      case 'mp4':
      case 'avi':
      case 'mov':
      case 'wmv':
        return 'video';
      case 'mp3':
      case 'wav':
      case 'ogg':
        return 'audio';
      case 'pdf':
        return 'pdf';
      case 'doc':
      case 'docx':
        return 'document';
      case 'xls':
      case 'xlsx':
      case 'csv':
        return 'spreadsheet';
      case 'txt':
      case 'md':
      case 'rtf':
        return 'text';
      case 'js':
      case 'jsx':
      case 'ts':
      case 'tsx':
      case 'json':
      case 'html':
      case 'css':
      case 'py':
      case 'java':
        return 'code';
    }
  }

  return 'default';
};

/**
 * Factory component that renders the appropriate icon based on file type
 */
export const FileIconFactory: React.FC<FileIconProps> = ({
  type,
  mimeType,
  fileName,
  className = '',
  size = 24,
}) => {
  const iconType = type || getFileTypeFromMime(mimeType, fileName);
  const iconProps = {
    size,
    className: className || 'text-brand-accent-50',
  };

  switch (iconType) {
    case 'image':
      return <FileImage {...iconProps} />;
    case 'video':
      return <FileVideo {...iconProps} />;
    case 'audio':
      return <FileAudio {...iconProps} />;
    case 'code':
      return <FileCode {...iconProps} />;
    case 'spreadsheet':
      return <FileSpreadsheet {...iconProps} />;
    case 'pdf':
    case 'document':
    case 'text':
      return <FileText {...iconProps} />;
    case 'default':
    default:
      return <File {...iconProps} />;
  }
};

/**
 * Wrapped icon component with background container matching Figma design
 */
interface FileIconContainerProps extends FileIconProps {
  containerClassName?: string;
  showBackground?: boolean;
}

export const FileIconContainer: React.FC<FileIconContainerProps> = ({
  type,
  mimeType,
  fileName,
  className,
  containerClassName,
  size = 24,
  showBackground = true,
}) => {
  if (!showBackground) {
    return (
      <FileIconFactory
        type={type}
        mimeType={mimeType}
        fileName={fileName}
        className={className}
        size={size}
      />
    );
  }

  return (
    <div
      className={`flex items-center justify-center bg-white rounded-xs ${containerClassName || 'w-10 h-10'}`}
    >
      <FileIconFactory
        type={type}
        mimeType={mimeType}
        fileName={fileName}
        className={className}
        size={size}
      />
    </div>
  );
};
