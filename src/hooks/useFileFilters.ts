import { useCallback, useMemo, useState } from 'react';

export type FileType =
  | 'created-in-loopops'
  | 'uploaded'
  | 'txt'
  | 'pdf'
  | 'doc'
  | 'image'
  | 'all';

export type SortOption =
  | 'newest-to-oldest'
  | 'oldest-to-newest'
  | 'alphabetical'
  | 'alphabetical-z-a'
  | (string & {});

export interface FileFilter {
  fileType: FileType;
  sortBy: SortOption;
}

export interface FilterCallbacks {
  onFileTypeChange?: (fileType: FileType) => void;
  onSortChange?: (sortBy: SortOption) => void;
}

export interface SortOptionItem {
  name: string;
  value: SortOption;
  action: () => void;
}

export interface UseFileFiltersProps extends FilterCallbacks {
  additionalSortOptions?: SortOptionItem[];
  initialSortBy?: SortOption;
}

/**
 * Hook to manage file filtering state and provide filter options
 */
export const useFileFilters = (props?: UseFileFiltersProps) => {
  const {
    additionalSortOptions = [],
    initialSortBy = 'newest-to-oldest',
    ...callbacks
  } = props || {};
  const [activeFileType, setActiveFileType] = useState<FileType>('all');
  const [activeSortBy, setActiveSortBy] = useState<SortOption>(initialSortBy);

  const handleFileTypeChange = useCallback(
    (fileType: FileType) => {
      setActiveFileType(fileType);
      callbacks?.onFileTypeChange?.(fileType);
    },
    [callbacks],
  );

  const handleSortChange = useCallback(
    (sortBy: SortOption) => {
      setActiveSortBy(sortBy);
      callbacks?.onSortChange?.(sortBy);
    },
    [callbacks],
  );

  // File type filter options
  const fileTypeOptions = [
    {
      name: 'All Files',
      value: 'all' as FileType,
      action: () => handleFileTypeChange('all'),
    },
    {
      name: 'Created in LoopOps',
      value: 'created-in-loopops' as FileType,
      action: () => handleFileTypeChange('created-in-loopops'),
    },
    {
      name: 'Uploaded',
      value: 'uploaded' as FileType,
      action: () => handleFileTypeChange('uploaded'),
    },
    {
      name: 'TXT',
      value: 'txt' as FileType,
      action: () => handleFileTypeChange('txt'),
    },
    {
      name: 'PDF',
      value: 'pdf' as FileType,
      action: () => handleFileTypeChange('pdf'),
    },
    {
      name: 'DOC',
      value: 'doc' as FileType,
      action: () => handleFileTypeChange('doc'),
    },
    {
      name: 'Image',
      value: 'image' as FileType,
      action: () => handleFileTypeChange('image'),
    },
  ];

  // Sort options
  const defaultSortOptions: SortOptionItem[] = useMemo(
    () => [
      {
        name: 'Newest to oldest',
        value: 'newest-to-oldest',
        action: () => handleSortChange('newest-to-oldest'),
      },
      {
        name: 'Oldest to newest',
        value: 'oldest-to-newest',
        action: () => handleSortChange('oldest-to-newest'),
      },
      {
        name:
          activeSortBy === 'alphabetical-z-a'
            ? 'Alphabetical (Z-A)'
            : 'Alphabetical',
        value: 'alphabetical',
        action: () => {
          if (activeSortBy === 'alphabetical') {
            handleSortChange('alphabetical-z-a');
          } else {
            handleSortChange('alphabetical');
          }
        },
      },
    ],
    [activeSortBy, handleSortChange],
  );

  // Merge default options with additional options
  // We wrap the additional option actions to ensure they also update local state if needed
  // or simply respect the caller's action.
  // Actually, usually we want the sort to change "activeSortBy".
  // The caller might want to do something ELSE in addition, or just set the sort.
  // If the caller passes 'action', they are responsible for calling handleSortChange if they want to update state?
  // Let's standardise: The caller provides value and name. The action is auto-generated to setSort(value).
  // BUT the user request said "export a setter and getter to add an option and their callback".
  // So maybe they want a custom callback.

  // Let's assume the additionalSortOptions follow the structure but we override the action to include setting the sort,
  // OR we just use their action.
  // The `SortFilter` component simply calls `option.action()`.
  // So if we want to update our local `activeSortBy`, we should wrap it.

  const mergedSortOptions = useMemo(
    () => [
      ...additionalSortOptions.map((opt) => ({
        ...opt,
        action: () => {
          handleSortChange(opt.value);
          if (opt.action) opt.action();
        },
      })),
      ...defaultSortOptions,
    ],
    [additionalSortOptions, defaultSortOptions, handleSortChange],
  );

  return {
    // State
    activeFileType,
    activeSortBy,

    // Options for dropdowns
    fileTypeOptions,
    sortOptions: mergedSortOptions,

    // Actions
    handleFileTypeChange,
    handleSortChange,

    // Reset functions
    resetFilters: () => {
      handleFileTypeChange('all');
      handleSortChange('newest-to-oldest');
    },
  };
};
