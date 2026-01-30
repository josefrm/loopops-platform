import React from 'react';
import { MindspaceFileCard } from '../MindspaceFileCard';
import { useSidebarRightContext } from './SidebarRightContext';

export const SidebarFileList: React.FC = () => {
  const { documents, isLoading, onFileClick } = useSidebarRightContext();

  if (isLoading) {
    return (
      <div className="text-neutral-grayscale-40 text-loop-12 text-center py-loop-4">
        Loading files...
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="text-neutral-grayscale-40 text-loop-12 text-center py-loop-4">
        No files yet
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 relative">
      <div className="h-full overflow-y-auto overflow-x-hidden scrollbar-hide flex flex-col gap-loop-4 pb-loop-4">
        {documents.map((doc) => (
          <MindspaceFileCard
            key={doc.id}
            fileName={doc.fileName}
            createdAt={doc.createdAt}
            onClick={() => onFileClick(doc.fileName)}
            fileData={{
              id: doc.id,
              signedUrl: doc.signedUrl,
              mimeType: doc.mimeType,
              fileSize: doc.fileSize,
            }}
          />
        ))}
      </div>

      {/* Fade gradient indicator for overflow content */}
      {documents.length > 3 && (
        <div
          className="absolute bottom-0 left-0 right-0 h-8 pointer-events-none"
          style={{
            background: `linear-gradient(to top, var(--neutral-grayscale-0), rgba(255, 255, 255, 0.8), transparent)`,
          }}
        />
      )}
    </div>
  );
};
