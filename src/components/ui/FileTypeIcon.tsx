import { FileText } from 'lucide-react';
import React from 'react';

interface FileTypeIconProps {
  fileName: string;
  className?: string;
  size?: number;
}

const ICON_MAPPING: Record<string, string> = {
  // PDF
  pdf: 'text_line_pdf.png',

  // Excel/Spreadsheets
  xls: 'text_line_xls.png',
  xlsx: 'text_line_xls.png',
  csv: 'text_line_xls.png', // Assuming csv uses xls icon based on list, or we could use generic text if preferred, but user said 'etc' implying grouping

  // PowerPoint
  ppt: 'text_line_ppt.png',
  pptx: 'text_line_ppt.png',

  // Word/Documents
  doc: 'text_line_doc.png',
  docx: 'text_line_doc.png',

  // Text
  txt: 'text_line_txt.png',
  md: 'text_line_md.png',
  markdown: 'text_line_md.png',

  // Images
  jpg: 'text_line_image.png',
  jpeg: 'text_line_image.png',
  png: 'text_line_image.png',
  gif: 'text_line_image.png',
  bmp: 'text_line_image.png',
  svg: 'text_line_image.png',
};

// Update mapping to include csv exact match
ICON_MAPPING['csv'] = 'text_line_csv.png';

export const FileTypeIcon: React.FC<FileTypeIconProps> = ({
  fileName,
  className = '',
  size = 40,
}) => {
  const getFileExtension = (name: string): string => {
    if (!name) return '';
    const parts = name.split('.');
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
  };

  const extension = getFileExtension(fileName);
  const iconFilename = ICON_MAPPING[extension];

  if (iconFilename) {
    return (
      <div
        className={`relative flex items-center justify-center ${className}`}
        style={{ width: size, height: size }}
      >
        <img
          src={`/images/file_icons/${iconFilename}`}
          alt={`${extension} file icon`}
          className="object-contain"
          style={{ width: '100%', height: '100%' }}
        />
      </div>
    );
  }

  // Fallback for unknown types
  return (
    <div
      className={`relative flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      <div className="flex items-center justify-center w-full h-full bg-neutral-grayscale-10 rounded-lg">
        <FileText
          className="text-neutral-grayscale-40"
          style={{ width: size * 0.6, height: size * 0.6 }}
          strokeWidth={1.5}
        />
      </div>
    </div>
  );
};
