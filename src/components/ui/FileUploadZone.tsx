import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  ModelCapabilities,
  ModelCapabilitiesService,
} from '@/services/ModelCapabilitiesService';
import { FileImage, Paperclip, Upload } from 'lucide-react';
import React, { useRef } from 'react';

interface FileUploadZoneProps {
  isDragOver: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onFileSelect: (files: FileList | null) => void;
  disabled?: boolean;
  className?: string;
  modelCapabilities?: ModelCapabilities | null;
}

export const FileUploadZone: React.FC<FileUploadZoneProps> = ({
  isDragOver,
  onDragOver,
  onDragLeave,
  onDrop,
  onFileSelect,
  disabled = false,
  className,
  modelCapabilities,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleButtonClick = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFileSelect(e.target.files);
    e.target.value = '';
  };

  const acceptAttribute = modelCapabilities
    ? ModelCapabilitiesService.getAcceptAttribute(modelCapabilities)
    : 'image/*,text/*,.pdf,.doc,.docx,.xls,.xlsx';

  const isDisabled =
    disabled || !modelCapabilities || !modelCapabilities?.supportsFileUpload;

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileChange}
        accept={acceptAttribute}
        disabled={isDisabled}
      />

      <div
        className={cn(
          'relative border-2 border-dashed rounded-lg p-4 transition-all duration-200',
          {
            'border-brand-accent-50 bg-brand-accent-10':
              isDragOver && !isDisabled,
            'border-neutral-grayscale-30 bg-neutral-grayscale-5':
              !isDragOver && !isDisabled,
            'border-neutral-grayscale-20 bg-neutral-grayscale-10 opacity-50 cursor-not-allowed':
              isDisabled,
          },
          className,
        )}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex gap-1">
            <Upload
              className={cn(
                'h-5 w-5',
                isDragOver && !isDisabled
                  ? 'text-brand-accent-50'
                  : 'text-neutral-grayscale-60',
              )}
            />
            <FileImage
              className={cn(
                'h-5 w-5',
                isDragOver && !isDisabled
                  ? 'text-brand-accent-50'
                  : 'text-neutral-grayscale-60',
              )}
            />
          </div>

          <div className="text-sm">
            {isDragOver && !isDisabled ? (
              <span className="text-brand-accent-70 font-medium">
                Drop files here to attach
              </span>
            ) : (
              <span className="text-neutral-grayscale-60">
                {!modelCapabilities ? (
                  'Model capabilities unknown - uploads disabled'
                ) : isDisabled && !modelCapabilities?.supportsFileUpload ? (
                  'File uploads not supported by this model'
                ) : (
                  <>
                    Drag files here or{' '}
                    <button
                      type="button"
                      onClick={handleButtonClick}
                      disabled={isDisabled}
                      className="text-brand-accent-50 hover:text-brand-accent-60 underline disabled:text-neutral-grayscale-50 disabled:no-underline disabled:cursor-not-allowed"
                    >
                      click to browse
                    </button>
                  </>
                )}
              </span>
            )}
          </div>

          <div className="text-xs text-neutral-grayscale-50">
            {!modelCapabilities
              ? 'Unable to determine supported file types'
              : ModelCapabilitiesService.getFileTypesDescription(
                  modelCapabilities,
                )}
          </div>
        </div>
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={handleButtonClick}
        disabled={disabled}
        className="flex items-center gap-1 text-neutral-grayscale-60 hover:text-brand-accent-50"
      >
        <Paperclip className="h-4 w-4" />
        Attach
      </Button>
    </>
  );
};
