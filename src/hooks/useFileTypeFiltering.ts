import { useMemo } from 'react';

export interface FilterableFile {
  id: string | number;
  mimeType?: string;
  createdInEditor?: boolean;
  created_at?: Date | string;
  fileName?: string;
  title?: string;
  fileSize?: string | number;
}

/**
 * Hook to apply file type filtering and sorting to a list of files
 * Works with both MindspaceDocument and ProjectCategoryItem types
 */
export const useFileTypeFiltering = <T extends FilterableFile>(
  items: T[],
  selectedFileType: string,
  selectedSort: string,
) => {
  // Helper function to get file type category from MIME type
  const getFileTypeCategory = (mimeType: string): string => {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType === 'application/pdf') return 'pdf';
    if (
      mimeType === 'application/msword' ||
      mimeType ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    )
      return 'doc';
    if (mimeType === 'text/plain' || mimeType === 'text/markdown') return 'txt';
    return 'other';
  };

  // Apply file type filter
  const filteredItems = useMemo(() => {
    if (selectedFileType === 'all') return items;

    // Handle special filters
    if (selectedFileType === 'created-in-loopops') {
      return items.filter((item) => item.createdInEditor === true);
    }

    if (selectedFileType === 'uploaded') {
      return items.filter((item) => item.createdInEditor !== true);
    }

    // Handle file type filters
    return items.filter((item) => {
      const fileTypeCategory = getFileTypeCategory(item.mimeType || '');
      return fileTypeCategory === selectedFileType;
    });
  }, [items, selectedFileType]);

  // Apply sorting
  const sortedItems = useMemo(() => {
    const sorted = [...filteredItems];
    const getFileName = (item: T) => item.fileName || item.title || '';

    switch (selectedSort) {
      case 'newest-to-oldest':
        return sorted.sort((a, b) => {
          const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
          return dateB - dateA;
        });
      case 'oldest-to-newest':
        return sorted.sort((a, b) => {
          const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
          return dateA - dateB;
        });
      case 'alphabetical':
        return sorted.sort((a, b) =>
          getFileName(a).localeCompare(getFileName(b)),
        );
      default:
        return sorted;
    }
  }, [filteredItems, selectedSort]);

  return sortedItems;
};
