import React, { useState } from 'react';

interface UseFileDragProps {
  fileData?: {
    id: string;
    fileName: string;
    signedUrl?: string; // Optional because SidebarCollapsedView docs might not have it populated yet? based on MindspaceFileCard usage it seems required for logic but optional in type
    mimeType?: string;
    fileSize?: string;
  };
  fileName: string; // Passed separately or derived from fileData, keeping flexible matching original usage
}

export const useFileDrag = ({ fileData, fileName }: UseFileDragProps) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragStart = (e: React.DragEvent) => {
    if (!fileData) return;
    setIsDragging(true);
    const dragData = {
      type: 'mindspace-file',
      fileName: fileName,
      signedUrl: fileData.signedUrl,
      mimeType: fileData.mimeType,
      fileSize: fileData.fileSize,
      id: fileData.id,
    };

    e.dataTransfer.setData('application/json', JSON.stringify(dragData));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  return {
    isDragging,
    handleDragStart,
    handleDragEnd,
  };
};
