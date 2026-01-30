import React, { useRef } from 'react';
import { ArrowUpFromLine } from 'lucide-react';

interface FileUploadProps {
  onFileSelect?: (files: FileList | null) => void;
  accept?: string;
  multiple?: boolean;
  className?: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onFileSelect,
  accept,
  multiple = false,
  className = '',
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    onFileSelect?.(files);
  };

  return (
    <div
      className={`flex flex-col items-center ${className} space-y-loop-2 ml-loop-2 h-loop-20`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      <div
        onClick={handleButtonClick}
        className="cursor-pointer w-loop-14 h-loop-14 bg-neutral-grayscale-20 hover:bg-neutral-grayscale-30 rounded-full flex items-center justify-center p-0 !mt-0"
      >
        <ArrowUpFromLine className="w-6 h-6 text-neutral-grayscale-60" />
      </div>
      <span
        onClick={handleButtonClick}
        className="text-neutral-grayscale-20 cursor-pointer"
        style={{
          fontSize: '12px',
          fontStyle: 'normal',
          fontWeight: 400,
          lineHeight: 'normal',
        }}
      >
        Upload
      </span>
    </div>
  );
};
