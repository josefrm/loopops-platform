import { useToast } from '@/hooks/use-toast';
import { useFileFilters } from '@/hooks/useFileFilters';
import { useFileTypeFiltering } from '@/hooks/useFileTypeFiltering';
import { MindspaceDocument } from '@/models/MindspaceDocument';
import { useMindspaceStore } from '@/stores/mindspaceStore';
import { useStagesStore } from '@/stores/stagesStore';
import { useWorkspaceProjectStore } from '@/stores/workspaceProjectStore';
import { Plus } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { MindspaceActionsBar } from '.';
import { CircleControlIcon } from '../ui/CircleControlIcon';
import { ControlButton } from '../ui/ControlButton';
import { FileTypeFilter } from '../ui/FileTypeFilter';
import { SortFilter } from '../ui/SortFilter';
import { MindspaceItemContent } from './MindspaceItemContent';
import { MindspaceNewCategoryModal } from './MindspaceNewCategoryModal';
import { MindspaceTileSkeleton } from './MindspaceTileSkeleton';

interface MindspaceTabContentProps {
  documents: MindspaceDocument[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  onDeleteDocument?: (id: string) => Promise<boolean>;
  onRemoveFromState?: (id: string) => void;
  onUploadFiles?: () => void;
  onFileSelected?: (fileId: string | number) => void;
  isLoading?: boolean;
  className?: string;
  onReloadDocuments?: () => Promise<void>;
  onSelectedFilesChange?: (
    selectedFiles: MindspaceDocument[],
    count: number,
  ) => void;
  onConvertToDeliverable?: (fileId: string, fileName: string) => void;
  onBulkConvertToDeliverable?: (fileIds: string[], fileNames: string[]) => void;
  onDownloadFiles?: (fileIds: (string | number)[]) => Promise<boolean>;
  onStartLoop?: (fileIds: (string | number)[]) => void;
  onBulkDelete?: (
    fileIds: (string | number)[],
  ) => Promise<{ success: boolean; deletedIds: string[] }>;
  clearSelectionTrigger?: number; // When this changes, clear all checkboxes
  isEditorOpen?: boolean;
  focusedFileId?: string | null;
}

export const MindspaceTabContent: React.FC<MindspaceTabContentProps> = ({
  documents,
  activeTab,
  onTabChange,
  onDeleteDocument,
  onRemoveFromState,
  onUploadFiles,
  onFileSelected,
  isLoading = false,
  className = '',
  onReloadDocuments,
  onSelectedFilesChange,
  onConvertToDeliverable,
  onBulkConvertToDeliverable,
  onDownloadFiles,
  onStartLoop,
  onBulkDelete,
  clearSelectionTrigger,
  isEditorOpen = false,
  focusedFileId,
}) => {
  // Use categories from store
  const categories = useMindspaceStore((state) => state.categories);
  const getTabCategoryId = useMindspaceStore((state) => state.getTabCategoryId);
  const getCategoryTabName = useMindspaceStore(
    (state) => state.getCategoryTabName,
  );
  const updateFileCategory = useMindspaceStore(
    (state) => state.updateFileCategory,
  );
  const createCategory = useMindspaceStore((state) => state.createCategory);

  // State for file type and sort filters
  const [selectedFileType, setSelectedFileType] = useState<string>('all');
  const [selectedSort, setSelectedSort] = useState<string>('newest-to-oldest');

  // Use the file filters hook
  const { fileTypeOptions, sortOptions } = useFileFilters({
    onFileTypeChange: (fileType) => {
      console.log('File type filter changed:', fileType);
      setSelectedFileType(fileType);
    },
    onSortChange: (sortBy) => {
      console.log('Sort filter changed:', sortBy);
      setSelectedSort(sortBy);
    },
  });

  // State to track the current active tab ID for UI updates
  const [currentActiveTabId, setCurrentActiveTabId] = useState<number>(
    getTabCategoryId(activeTab),
  );

  // State for items and loading
  const [items, setItems] = useState<MindspaceDocument[]>([]);
  const [checkedItems, setCheckedItems] = useState<Set<string | number>>(
    new Set(),
  );

  // State for tracking items being deleted (for animation)
  const [deletingItems, setDeletingItems] = useState<Set<string | number>>(
    new Set(),
  );

  // State for bulk delete in progress
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // State for bulk download in progress
  const [isBulkDownloading, setIsBulkDownloading] = useState(false);

  // State for New Category modal
  const [isNewCategoryModalOpen, setIsNewCategoryModalOpen] = useState(false);

  // State for category management

  // State for category management
  // State for category management
  const [isUpdatingCategory, setIsUpdatingCategory] = useState(false);

  // Ref for horizontal scrolling with mouse wheel
  const tabsContainerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = tabsContainerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.deltaY !== 0) {
        e.preventDefault();
        container.scrollLeft += e.deltaY;
      }
    };

    container.addEventListener('wheel', handleWheel);

    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, []);

  // Get project and stages store
  const selectedProject = useWorkspaceProjectStore((state) =>
    state.getCurrentProject(),
  );
  const { loadStages } = useStagesStore();
  const { toast } = useToast();

  // Handle category change for selected files
  const handleCategoryChange = async (newCategoryId: string) => {
    const selectedFileIds = Array.from(checkedItems);
    if (selectedFileIds.length === 0) return;

    const categoryId = parseInt(newCategoryId);
    const categoryName = getCategoryTabName(categoryId);

    setIsUpdatingCategory(true);

    try {
      const success = await updateFileCategory(selectedFileIds, categoryId);

      if (success) {
        toast({
          title: 'Category updated',
          description: `${selectedFileIds.length} file(s) moved to ${categoryName}`,
        });

        // Clear selections
        setCheckedItems(new Set());

        // Optionally refresh the documents list
        if (onReloadDocuments) {
          await onReloadDocuments();
        }
      } else {
        toast({
          title: 'Failed to update category',
          description: 'There was an error moving the files. Please try again.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error updating file category:', error);
      toast({
        title: 'Failed to update category',
        description: 'There was an error moving the files. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsUpdatingCategory(false);
    }
  };

  // Load stages when component mounts and project is available
  useEffect(() => {
    if (selectedProject?.id) {
      loadStages(selectedProject.id);
    }
  }, [selectedProject?.id, loadStages]);

  // Handle checkbox changes
  const handleCheckboxChange = (itemId: string | number, checked: boolean) => {
    setCheckedItems((prev) => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(itemId);
      } else {
        newSet.delete(itemId);
      }
      return newSet;
    });
  };

  // Handle opening the convert modal
  const handleConvertToDeliverable = (fileName: string) => {
    // Find the document with this fileName to get its ID
    const document = documents.find((doc) => doc.fileName === fileName);
    if (document?.id) {
      onConvertToDeliverable?.(document.id.toString(), fileName);
    } else {
      console.error('Could not find document ID for file:', fileName);
    }
  };

  // Handle successful category creation
  const handleCategoryCreated = (categoryName: string) => {
    console.log('New category created:', categoryName);
    // TODO: Add the new category to the categories list and refresh the UI
    // This would require updating the categories from the hook or fetching from API
  };

  // Handle opening new category modal
  const handleCreateCategory = () => {
    setIsNewCategoryModalOpen(true);
  };

  // Handle animated delete
  const handleAnimatedDelete = async (itemId: string | number) => {
    if (!onDeleteDocument) return;

    // Mark item as being deleted
    setDeletingItems((prev) => new Set(prev).add(itemId));

    try {
      // Call the delete function
      const success = await onDeleteDocument(itemId.toString());

      if (success) {
        // Wait for animation to complete before removing from state
        setTimeout(() => {
          onRemoveFromState?.(itemId.toString());
          setDeletingItems((prev) => {
            const newSet = new Set(prev);
            newSet.delete(itemId);
            return newSet;
          });
        }, 300); // Match the animation duration
      } else {
        // If deletion failed, remove from deleting state
        setDeletingItems((prev) => {
          const newSet = new Set(prev);
          newSet.delete(itemId);
          return newSet;
        });
      }
    } catch (error) {
      console.error('Error deleting item:', error);
      // Remove from deleting state on error
      setDeletingItems((prev) => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });
    }
  };

  // Handle bulk delete of selected files
  const handleBulkDelete = async () => {
    if (!onBulkDelete || checkedItems.size === 0) return;

    const fileIds = Array.from(checkedItems);
    setIsBulkDeleting(true);

    // Mark all selected items as being deleted for animation
    setDeletingItems(new Set(fileIds));

    try {
      const result = await onBulkDelete(fileIds);

      if (result.deletedIds.length > 0) {
        // Wait for animation to complete before removing from state
        setTimeout(() => {
          // Remove successfully deleted items from state
          result.deletedIds.forEach((id) => {
            onRemoveFromState?.(id);
          });

          // Clear deleting state for deleted items
          setDeletingItems((prev) => {
            const newSet = new Set(prev);
            result.deletedIds.forEach((id) => newSet.delete(id));
            return newSet;
          });

          // Clear selection
          setCheckedItems(new Set());
        }, 300); // Match the animation duration
      }

      // Clear deleting state for items that failed to delete
      const failedIds = fileIds.filter(
        (id) => !result.deletedIds.includes(id.toString()),
      );
      if (failedIds.length > 0) {
        setDeletingItems((prev) => {
          const newSet = new Set(prev);
          failedIds.forEach((id) => newSet.delete(id));
          return newSet;
        });
      }
    } catch (error) {
      console.error('Error during bulk delete:', error);
      // Clear all deleting states on error
      setDeletingItems(new Set());
    } finally {
      setIsBulkDeleting(false);
    }
  };

  // Handle bulk download of selected files as ZIP
  const handleBulkDownload = async () => {
    if (!onDownloadFiles || checkedItems.size === 0) return;

    const fileIds = Array.from(checkedItems);
    setIsBulkDownloading(true);

    try {
      await onDownloadFiles(fileIds);
    } catch (error) {
      console.error('Error during bulk download:', error);
    } finally {
      setIsBulkDownloading(false);
    }
  };

  // Handle single file download using the bulk download action
  const handleDownloadFile = async (fileId: string) => {
    if (!onDownloadFiles) return;

    try {
      await onDownloadFiles([fileId]);
    } catch (error) {
      console.error('Error during file download:', error);
    }
  };

  // Notify parent about selection changes
  useEffect(() => {
    if (onSelectedFilesChange) {
      // Map selected items back to documents
      const selectedDocuments = documents.filter((doc) =>
        checkedItems.has(doc.id),
      );
      onSelectedFilesChange(selectedDocuments, checkedItems.size);
    }
  }, [checkedItems, documents, onSelectedFilesChange]);

  // Clear checkboxes when parent triggers a clear (e.g., from bulk actions)
  useEffect(() => {
    if (clearSelectionTrigger !== undefined && clearSelectionTrigger > 0) {
      setCheckedItems(new Set());
    }
  }, [clearSelectionTrigger]);

  // Update state when activeTab prop changes
  useEffect(() => {
    setCurrentActiveTabId(getTabCategoryId(activeTab));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Get active category based on current active tab ID
  const activeCategory =
    categories.find((cat) => cat.id === currentActiveTabId) || null;

  // Load items when category, documents, or filters change
  useEffect(() => {
    if (!activeCategory) {
      return;
    }

    // Filter by category
    let categoryFilteredItems = documents;
    if (activeCategory.name !== 'All') {
      categoryFilteredItems = documents.filter(
        (doc) => doc.categoryId === activeCategory.id,
      );
    }

    setItems(categoryFilteredItems);
    setCheckedItems(new Set());
  }, [activeCategory, documents]);

  // Apply file type filtering and sorting
  const filteredAndSortedItems = useFileTypeFiltering(
    items,
    selectedFileType,
    selectedSort,
  );

  // Scroll to focused item when documents load
  useEffect(() => {
    if (focusedFileId && filteredAndSortedItems.length > 0) {
      const focusedElement = document.getElementById(
        `mindspace-item-${focusedFileId}`,
      );
      if (focusedElement) {
        focusedElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [focusedFileId, filteredAndSortedItems]);

  // Handle tab change with proper category mapping
  const handleTabChange = (categoryId: number) => {
    setCurrentActiveTabId(categoryId);

    const newTabName = getCategoryTabName(categoryId);
    onTabChange(newTabName);
  };

  // Determine what to show: loading, empty, or items
  // isLoading from parent = documents are still being fetched from API
  // Only show empty state when NOT loading AND items are empty
  const showLoading = isLoading;
  const showEmptyState = !isLoading && filteredAndSortedItems.length === 0;
  const showItems = !isLoading && filteredAndSortedItems.length > 0;

  return (
    <div
      className={`flex flex-col h-full space-y-loop-6 ${className}`}
      data-testid="mindspace-tab-content"
    >
      {/* Left side: Empty when no files selected */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-loop-2 pr-loop-2">
          <p className="text-neutral-grayscale-60 text-lg ">
            These are your personal files. Work on drafts, use them to start a
            Loop, or convert them to a Project Artifact to share them with your
            team members.
          </p>
        </div>

        {/* Right side: Upload Files and filter buttons (when no files selected) */}
        <div className="flex items-center gap-loop-2">
          <ControlButton
            type="transparent"
            size="md"
            fontSize={11}
            text="Upload Files"
            onClick={onUploadFiles}
          />
          <FileTypeFilter options={fileTypeOptions} dropdownAlign="end" />
          <SortFilter options={sortOptions} dropdownAlign="end" />
        </div>
      </div>
      {/* Tab Navigation - Scrollable with fixed + Category button */}
      <div className="flex mb-loop-6 w-full flex-shrink-0 relative items-center gap-loop-2">
        {/* Scrollable categories container with fades */}
        <div
          className="relative flex-1 min-w-0"
          data-testid="mindspace-tabs-navigation"
        >
          {/* Left Fade */}
          <div className="absolute left-0 top-0 bottom-0 w-loop-2 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />

          {/* Right Fade */}
          <div className="absolute right-0 top-0 bottom-0 w-loop-2 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />

          <div
            ref={tabsContainerRef}
            className="flex overflow-x-auto overflow-y-hidden scrollbar-hide relative pr-loop-4 cursor-ew-resize"
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            }}
          >
            {/* Categories */}
            <div className="flex min-w-full">
              {categories.map((category) => {
                return (
                  <div
                    key={category.id}
                    className="flex flex-col items-center cursor-pointer flex-1 pt-loop-2 select-none"
                    style={{
                      minWidth: '104px',
                    }}
                    onClick={() => handleTabChange(category.id)}
                    title={category.name}
                  >
                    <span
                      className={`text-base font-medium transition-colors duration-200 whitespace-nowrap px-loop-4 block overflow-hidden text-ellipsis max-w-full text-center ${
                        currentActiveTabId === category.id
                          ? 'text-neutral-grayscale-90'
                          : 'text-neutral-grayscale-60 hover:text-neutral-grayscale-90'
                      }`}
                    >
                      {category.name}
                    </span>
                    {/* Tab indicator bar */}
                    <div
                      className="mt-loop-2 transition-all duration-300 ease-in-out w-full"
                      style={{
                        height:
                          currentActiveTabId === category.id ? '4px' : '1px',
                        // marginTop:
                        //   currentActiveTabId === category.id ? '0px' : '3px',
                        backgroundColor:
                          currentActiveTabId === category.id
                            ? 'var(--brand-accent-50)'
                            : 'var(--neutral-grayscale-40)',
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Circle + Category button */}
        <div className="flex-shrink-0 pt-loop-2 px-loop-2">
          <CircleControlIcon
            icon={<Plus width={24} fill="currentColor" />}
            onClick={handleCreateCategory}
            type="white"
            size="md"
            className="border border-neutral-grayscale-90 text-neutral-grayscale-90 hover:bg-neutral-grayscale-10 hover:text-neutral-grayscale-90"
            label="Create Category"
          />
        </div>
      </div>

      {/* Actions Row */}
      <MindspaceActionsBar
        checkedItems={checkedItems}
        isEditorOpen={isEditorOpen}
        categories={categories}
        isUpdatingCategory={isUpdatingCategory}
        isBulkDownloading={isBulkDownloading}
        isBulkDeleting={isBulkDeleting}
        documents={documents}
        onCategoryChange={handleCategoryChange}
        onStartLoop={onStartLoop}
        onBulkConvertToDeliverable={onBulkConvertToDeliverable}
        onBulkDownload={handleBulkDownload}
        onBulkDelete={handleBulkDelete}
      />

      {/* Content Area */}
      <div
        className="flex-1 min-h-0 w-full relative"
        data-testid="mindspace-content-area"
      >
        <div
          className="h-full overflow-y-auto overflow-x-hidden scrollbar-hide pr-loop-2"
          data-testid="mindspace-files-list"
        >
          {/* Loading State */}
          {showLoading && (
            <div className="space-y-loop-4 pt-loop-6 pr-loop-2">
              <MindspaceTileSkeleton count={3} />
            </div>
          )}

          {/* Empty State */}
          {showEmptyState && (
            <div
              className="flex flex-col items-center justify-center h-full p-loop-8 pr-loop-2"
              data-testid="mindspace-empty-state"
            >
              <img
                src="/images/no-files.png"
                alt="No files"
                className="mb-loop-4"
              />
              <p className="text-neutral-grayscale-40 text-lg text-center">
                Start a Loop to create files you can save in your Mindspace.
              </p>
            </div>
          )}

          {/* Items List */}
          {showItems && (
            <div className="pb-loop-4" data-testid="mindspace-items-list">
              {filteredAndSortedItems.map((item) => {
                const isChecked = checkedItems.has(item.id);
                const isDeleting = deletingItems.has(item.id);

                return (
                  <div
                    key={item.id}
                    id={`mindspace-item-${item.id}`}
                    data-testid={`mindspace-item-${item.id}`}
                    className={`transition-all duration-300 ease-out overflow-hidden ${
                      isDeleting
                        ? 'transform translate-x-full opacity-0 h-0 mb-0'
                        : 'transform translate-x-0 opacity-100 h-auto mb-loop-4'
                    }`}
                  >
                    <MindspaceItemContent
                      fileName={item.fileName}
                      fileSize={item.fileSize}
                      uploadProgress={item.uploadProgress}
                      createdDate={
                        item.createdAt ? new Date(item.createdAt) : new Date()
                      }
                      signedUrl={item.signedUrl}
                      createdInEditor={item.createdInEditor}
                      isSelected={isChecked}
                      isFocused={focusedFileId === item.id}
                      fileId={item.id.toString()}
                      mimeType={item.mimeType}
                      onSelect={(selected) =>
                        handleCheckboxChange(item.id, selected)
                      }
                      belongsToStage={item.belongsToStage}
                      isDeliverable={item.isDeliverable}
                      onConvertToDeliverable={() =>
                        handleConvertToDeliverable(item.fileName)
                      }
                      onDelete={() => handleAnimatedDelete(item.id)}
                      onDownload={() => handleDownloadFile(item.id.toString())}
                      onClick={() => onFileSelected?.(item.id)}
                      isCompact={isEditorOpen}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Fade gradient indicator for overflow content */}
        {showItems && filteredAndSortedItems.length > 3 && (
          <div
            className="absolute bottom-0 left-0 right-0 h-8 pointer-events-none"
            style={{
              background: `linear-gradient(to top, var(--neutral-grayscale-0), rgba(255, 255, 255, 0.8), transparent)`,
            }}
          />
        )}
      </div>

      {/* New Category Modal */}
      <MindspaceNewCategoryModal
        open={isNewCategoryModalOpen}
        onOpenChange={setIsNewCategoryModalOpen}
        onSuccess={handleCategoryCreated}
        onCreateCategory={createCategory}
      />
    </div>
  );
};
