import { useState } from 'react';
import { ReviewFile } from './ReviewFileItem';

export const useReviewFiles = (initialFiles?: ReviewFile[]) => {
  const [files, setFiles] = useState<ReviewFile[]>(
    initialFiles && initialFiles.length > 0 ? initialFiles : [],
  );

  const updateFile = (id: string, updates: Partial<ReviewFile>) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...updates } : f)),
    );
  };

  const deleteFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const completedFiles = files.filter((f) => !f.hasMissingInfo);
  const missingInfoFiles = files.filter((f) => f.hasMissingInfo);

  return {
    files,
    completedFiles,
    missingInfoFiles,
    updateFile,
    deleteFile,
  };
};
