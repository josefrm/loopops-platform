import { cn } from '@/lib/utils';
import React from 'react';
import { createPortal } from 'react-dom';

export interface UploadingDocument {
  id: string;
  fileName: string;
  uploadProgress?: number;
}

interface ProcessingFilesOverlayProps {
  uploadingDocuments: UploadingDocument[];
  containerClassName?: string;
  title?: string;
  description?: string;
}

export const ProcessingFilesOverlay: React.FC<ProcessingFilesOverlayProps> = ({
  uploadingDocuments,
  containerClassName,
  title = 'Processing Files',
  description = 'Uploading and extracting metadata from your files. This may take a moment for large files...',
}) => {
  if (uploadingDocuments.length === 0) return null;

  return createPortal(
    <div
      className={cn(
        'fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center',
        containerClassName,
      )}
    >
      <div className="bg-white rounded-lg p-loop-8 max-w-md w-full mx-loop-4 shadow-xl">
        <div className="flex flex-col gap-loop-6">
          <div className="flex items-center gap-loop-3">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-brand-accent-50 border-t-transparent" />
            <h3 className="text-lg font-semibold text-neutral-grayscale-90">
              {title}
            </h3>
          </div>
          <p className="text-sm text-neutral-grayscale-60">{description}</p>
          <div className="space-y-loop-3">
            {uploadingDocuments.map((doc) => (
              <div key={doc.id} className="space-y-loop-1">
                <div className="flex items-center justify-between text-base text-neutral-grayscale-70">
                  <span className="truncate flex-1" title={doc.fileName}>
                    {doc.fileName}
                  </span>
                  <span className="text-neutral-grayscale-50 ml-loop-2">
                    {doc.uploadProgress || 0}%
                  </span>
                </div>
                <div className="w-full bg-neutral-grayscale-10 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-brand-accent-50 h-full transition-all duration-300 ease-out"
                    style={{ width: `${doc.uploadProgress || 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};
