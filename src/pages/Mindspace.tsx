import { Mindspace2Section, MindspaceTabContent } from '@/components/mindspace';
import { LoopOpsSidebarLeft } from '@/components/ui/loopops-branding/LoopOpsSidebarLeft';
import { UserMenu } from '@/components/user/UserMenu';
import { WalkthroughInfo } from '@/components/walkthrough/WalkthroughInfo';
import { WalkthroughOverlay } from '@/components/walkthrough/WalkthroughOverlay';
import { createMindspaceWalkthroughSteps } from '@/components/walkthrough/mindspaceWalkthroughHelpers';
import { STORAGE_KEYS } from '@/constants/storageKeys';
import { useSidebarWidth } from '@/contexts/SidebarWidthContext';
import { useToast } from '@/hooks/use-toast';
import { useMindspaceActions } from '@/hooks/useMindspaceActions';
import { useMindspaceEditor } from '@/hooks/useMindspaceEditor';
import { useMindspaceFileUpload } from '@/hooks/useMindspaceFileUpload';
import { useWalkthrough } from '@/hooks/useWalkthrough';
import { StorageService } from '@/services/StorageService';
import { UserPreferencesService } from '@/services/UserPreferencesService';
import { useMindspaceStore } from '@/stores/mindspaceStore';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ConvertToDeliverableStageModal } from '../components/mindspace/ConvertToDeliverableStageModal';
import { TextureIcon } from '../components/ui/icons/TextureIcon';

const Mindspace = () => {
  const { leftSidebarWidth } = useSidebarWidth();
  const [searchParams] = useSearchParams();
  const focusedFileId = searchParams.get('fileId');
  const [focusedFileOpened, setFocusedFileOpened] = useState(false);
  const [localFocusedFileId, setLocalFocusedFileId] = useState<string | null>(
    null,
  );

  // Effective focused file ID - local state takes precedence over URL parameter
  const [effectiveFocusedFileId, setEffectiveFocusedFileId] = useState(
    localFocusedFileId || focusedFileId,
  );

  const [activeTab, setActiveTab] = useState<string>('All');
  const [walkthroughCompleted, setWalkthroughCompleted] = useState(() => {
    return (
      StorageService.getItem<boolean>(
        STORAGE_KEYS.MINDSPACE_WALKTHROUGH_COMPLETED,
        'local',
      ) || false
    );
  });

  // State for Convert To Deliverable modal
  const [isConvertToDeliverableModalOpen, setIsConvertToDeliverableModalOpen] =
    useState(false);
  const [selectedFileNamesForConvert, setSelectedFileNamesForConvert] =
    useState<string[]>([]);
  const [selectedFileIdsForConvert, setSelectedFileIdsForConvert] = useState<
    string[]
  >([]);

  const { toast } = useToast();

  const setStoreDocuments = useMindspaceStore((state) => state.setDocuments);

  // Legacy hook - will eventually be replaced by store
  const {
    documents: hookDocuments,
    isLoading: hookLoading,
    fileInputRef,
    handleFileSelect,
    triggerFileSelect,
    createMarkdownFile,
    updateMarkdownFile,
    fetchFileContent,
    deleteDocument,
    bulkDeleteDocuments,
    bulkDownloadDocuments,
    removeDocumentFromState,
    fetchDocuments,
  } = useMindspaceFileUpload();

  // Sync hook documents to store (bridge during migration)
  // This allows other components to start using the store
  useEffect(() => {
    if (hookDocuments.length > 0 || !hookLoading) {
      setStoreDocuments(hookDocuments);
    }
  }, [hookDocuments, hookLoading, setStoreDocuments]);

  // Use hook values for now (gradual migration)
  const documents = hookDocuments;
  const isLoading = hookLoading;

  // Categories from store
  const getTabCategoryId = useMindspaceStore((state) => state.getTabCategoryId);
  const fetchCategories = useMindspaceStore((state) => state.fetchCategories);
  const activeCategoryId = getTabCategoryId(activeTab);

  // Fetch categories on mount (only once)
  const hasFetchedCategoriesRef = useRef(false);
  useEffect(() => {
    if (!hasFetchedCategoriesRef.current) {
      hasFetchedCategoriesRef.current = true;
      fetchCategories();
    }
  }, [fetchCategories]);

  // Create a memoized adapter for createMarkdownFile to prevent infinite loops
  // caused by unstable function references in the dependency array of useMindspaceEditor
  const handleCreateMarkdownFileAdapter = useCallback(
    (content: string, fileName?: string) => {
      return createMarkdownFile(content, fileName, activeCategoryId);
    },
    [createMarkdownFile, activeCategoryId],
  );

  // Use the new editor hook
  const editor = useMindspaceEditor({
    fetchFileContent,
    updateMarkdownFile,
    createMarkdownFile: handleCreateMarkdownFileAdapter,
  });

  // Handle opening the Convert To Deliverable modal (supports both single and bulk)
  const handleConvertToDeliverable = useCallback(
    (fileIds: string[], fileNames: string[]) => {
      setSelectedFileNamesForConvert(fileNames);
      setSelectedFileIdsForConvert(fileIds);
      setIsConvertToDeliverableModalOpen(true);
    },
    [],
  );

  // Handle single file convert to deliverable (called from individual file actions)
  const handleSingleFileConvertToDeliverable = useCallback(
    (fileId: string, fileName: string) => {
      handleConvertToDeliverable([fileId], [fileName]);
    },
    [handleConvertToDeliverable],
  );

  // Use the new actions hook for bulk operations
  const actions = useMindspaceActions({
    deleteDocument,
    bulkDeleteDocuments,
    bulkDownloadDocuments,
    openConvertToDeliverableModal: handleConvertToDeliverable,
    openCreateMode: editor.openCreateMode,
    currentFile: editor.currentFile,
    onFilesDeleted: (deletedIds) => {
      // If we have specific deleted IDs, remove them from state locally
      // This prevents the "ghost item" issue caused by racing fetchDocuments
      if (deletedIds && deletedIds.length > 0) {
        deletedIds.forEach((id) => removeDocumentFromState(id));
      } else {
        // Fallback to full refresh if no IDs provided
        fetchDocuments();
      }
    },
  });

  // Handler for when a file is selected from the list
  const handleOnFileSelected = (fileId: string | number) => {
    const file = documents.find((doc) => doc.id === fileId);

    if (!file) {
      console.error('[Mindspace] File not found:', fileId);
      return;
    }

    // Update focused file ID to show focus indicator on the item
    const fileIdString = fileId.toString();
    setLocalFocusedFileId(fileIdString);
    setEffectiveFocusedFileId(fileIdString);

    // Open the file in edit mode
    editor.openEditMode(file);
  };

  // Auto-open focused file when documents load
  useEffect(() => {
    if (
      focusedFileId &&
      documents.length > 0 &&
      !isLoading &&
      !focusedFileOpened
    ) {
      const focusedFile = documents.find((doc) => doc.id === focusedFileId);
      if (focusedFile) {
        // Set the local focused file to the URL parameter file
        setLocalFocusedFileId(focusedFileId);
        // Small delay to ensure the scroll animation completes first
        setTimeout(() => {
          handleOnFileSelected(focusedFileId);
          setFocusedFileOpened(true); // Mark as opened to prevent re-opening
        }, 500);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusedFileId, documents, isLoading, focusedFileOpened]);

  // Handler for animated delete (single file from list)
  const handleDeleteDocument = async (fileId: string): Promise<boolean> => {
    // Close editor if the deleted file is the one currently open
    // Note: accessing editor.currentFile directly since this function is not memoized
    if (editor.currentFile?.id === fileId) {
      handleCloseEditor();
    }
    const result = await deleteDocument(fileId);
    return result;
  };

  // Handler for closing editor/preview - clears focus
  const handleCloseEditor = useCallback(() => {
    setEffectiveFocusedFileId(null); // Clear focus when editor/preview is closed
    editor.closeEditor();
  }, [editor]);

  // Handler for bulk download with toast notifications
  const handleDownloadSelected = useCallback(async () => {
    const count = actions.selectedFilesCount;
    toast({
      title: 'Downloading files',
      description: `Starting download of ${count} file(s)...`,
    });
    await actions.downloadSelectedFiles();
    toast({
      title: 'Download complete',
      description: `${count} file(s) downloaded successfully`,
    });
  }, [actions, toast]);

  // Handler for downloading the currently viewed file (for editor/viewer)
  const handleDownloadCurrentFile = useCallback(async () => {
    if (!editor.currentFile) return;

    toast({
      title: 'Downloading file',
      description: `Downloading ${editor.currentFile.fileName}...`,
    });
    await bulkDownloadDocuments([editor.currentFile.id]);
  }, [editor.currentFile, bulkDownloadDocuments, toast]);

  // Handler for bulk delete with confirmation toast
  const handleDeleteSelected = useCallback(async () => {
    // Check if the currently open file is about to be deleted
    // We check this BEFORE deletion action
    if (
      editor.currentFile &&
      actions.selectedFiles.some((f) => f.id === editor.currentFile?.id)
    ) {
      handleCloseEditor();
    }

    const count = actions.selectedFilesCount;
    const deletedCount = await actions.deleteSelectedFiles();
    toast({
      title: 'Files deleted',
      description: `${deletedCount} of ${count} file(s) deleted successfully`,
    });
  }, [actions, toast, editor.currentFile, handleCloseEditor]);

  // Walkthrough refs
  const tabContentRef = useRef<HTMLDivElement>(null);
  const uploadSectionRef = useRef<HTMLDivElement>(null);
  const leftSidebarRef = useRef<HTMLDivElement>(null);

  // Create walkthrough steps and controller
  const mindspaceWalkthroughSteps = createMindspaceWalkthroughSteps(
    {
      tabContentRef,
      uploadSectionRef,
      leftSidebarRef,
    },
    {
      onNextStep: () => mindspaceWalkthrough.nextStep(),
      onFinishWalkthrough: () => {
        mindspaceWalkthrough.skipWalkthrough();
        setWalkthroughCompleted(true);
        StorageService.setItem(
          STORAGE_KEYS.MINDSPACE_WALKTHROUGH_COMPLETED,
          true,
          'local',
        );
        UserPreferencesService.completeWalkthrough('mindspace');
      },
    },
  );

  const mindspaceWalkthrough = useWalkthrough(mindspaceWalkthroughSteps);

  return (
    <div
      className="min-h-screen h-screen w-full bg-neutral-grayscale-0 flex overflow-hidden"
      data-testid="mindspace-page"
    >
      {/* Hidden file input for allowed file types */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.txt,.md,.png,.jpg,.jpeg,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown,image/png,image/jpeg,image/jpg"
        multiple={true}
        onChange={(e) => handleFileSelect(e.target.files, activeCategoryId)}
        style={{ display: 'none' }}
        data-testid="mindspace-file-input"
      />

      {/* Fixed Left Sidebar */}
      <LoopOpsSidebarLeft
        ref={leftSidebarRef}
        data-testid="mindspace-sidebar"
      />

      {/* Main content area with left margin to account for sidebar */}
      <div
        className="flex-1 flex min-w-0 overflow-hidden"
        style={{ paddingLeft: `${leftSidebarWidth}px` }}
      >
        {/* Section 1: Files and Notes List */}
        <div
          className="bg-white flex flex-col overflow-hidden p-loop-6 min-w-0"
          style={{ width: editor.isEditorOpen ? '40%' : '70%' }}
        >
          {/* Header - Fixed */}
          <div className="flex flex-col flex-shrink-0">
            {/* First Row: Title */}
            <div className="h-loop-10 flex items-center justify-between mb-loop-10 flex-shrink-0">
              <div className="flex items-center space-x-loop-2">
                <TextureIcon width={24} />
                <h1
                  className="text-2xl font-semibold text-neutral-grayscale-90"
                  data-testid="mindspace-title"
                >
                  Mindspace
                </h1>
              </div>
              <UserMenu />
            </div>
          </div>

          {/* Mindspace Tab Content - Scrollable */}
          <div
            className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide"
            ref={tabContentRef}
          >
            <MindspaceTabContent
              documents={documents}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              onDeleteDocument={handleDeleteDocument}
              onRemoveFromState={removeDocumentFromState}
              onUploadFiles={triggerFileSelect}
              onSelectedFilesChange={actions.handleFilesSelected}
              clearSelectionTrigger={actions.clearSelectionTrigger}
              isLoading={isLoading}
              onFileSelected={handleOnFileSelected}
              onReloadDocuments={fetchDocuments}
              onConvertToDeliverable={handleSingleFileConvertToDeliverable}
              onBulkConvertToDeliverable={handleConvertToDeliverable}
              onBulkDelete={bulkDeleteDocuments}
              onDownloadFiles={bulkDownloadDocuments}
              isEditorOpen={editor.isEditorOpen}
              focusedFileId={effectiveFocusedFileId}
              onStartLoop={actions.startLoopWithSelected}
            />
          </div>
        </div>

        {/* Section 2: Upload Menu */}
        <Mindspace2Section
          uploadSectionRef={uploadSectionRef}
          onUploadFiles={triggerFileSelect}
          onCreateFile={editor.openCreateMode}
          selectedFile={editor.currentFile}
          onClearSelection={handleCloseEditor}
          isEditorOpen={editor.isEditorOpen}
          selectedFilesCount={actions.selectedFilesCount}
          onDownloadSelected={handleDownloadSelected}
          onConvertToDeliverableSelected={
            actions.convertSelectedFilesToDeliverable
          }
          onDeleteSelected={handleDeleteSelected}
          onClearAndCreate={actions.clearSelectionAndCreate}
          // Pass editor props
          editorContent={editor.content}
          editorMode={editor.mode}
          isLoadingContent={editor.isLoadingContent}
          isSaving={editor.isSaving}
          onSaveContent={editor.saveContent}
          onContentChange={editor.updateContent}
          onConvertToDeliverable={handleSingleFileConvertToDeliverable}
          handleDownload={handleDownloadCurrentFile}
          onStartLoop={actions.startLoopCurrentFile}
        />
      </div>

      {/* Walkthrough System for Mindspace */}
      {!walkthroughCompleted && !mindspaceWalkthrough.isActive && (
        <WalkthroughOverlay
          title="🧠 Welcome to your Mindspace"
          description={`
            This is your private area, where your files live before they’re ready to be shared — a flexible space to work your own way.

Use it to explore ideas and shape them freely. When something feels ready, simply add it to the project.
            `}
          isVisible={true}
          secondaryButton={{
            title: 'Skip Tour',
            action: () => {
              setWalkthroughCompleted(true);
              StorageService.setItem(
                STORAGE_KEYS.MINDSPACE_WALKTHROUGH_COMPLETED,
                true,
                'local',
              );
              UserPreferencesService.completeWalkthrough('mindspace');
            },
          }}
          primaryButton={{
            title: 'Yes, show me',
            action: () => mindspaceWalkthrough.startWalkthrough(),
          }}
        />
      )}

      {mindspaceWalkthrough.isActive && mindspaceWalkthrough.currentStep && (
        <WalkthroughInfo
          title={mindspaceWalkthrough.currentStep.title}
          description={mindspaceWalkthrough.currentStep.description}
          targetRef={mindspaceWalkthrough.currentStep.targetRef}
          placement={mindspaceWalkthrough.currentStep.placement}
          offset={mindspaceWalkthrough.currentStep.offset}
          centered={mindspaceWalkthrough.currentStep.centered}
          primaryButton={mindspaceWalkthrough.currentStep.primaryButton}
          secondaryButton={mindspaceWalkthrough.currentStep.secondaryButton}
          iconSection={mindspaceWalkthrough.currentStep.iconSection}
          className={mindspaceWalkthrough.currentStep.className}
          animation={mindspaceWalkthrough.currentStep.animation}
        />
      )}

      {/* Convert To Deliverable Modal - Global for Mindspace page */}
      <ConvertToDeliverableStageModal
        open={isConvertToDeliverableModalOpen}
        onOpenChange={setIsConvertToDeliverableModalOpen}
        // Single file props (backward compatible)
        fileName={
          selectedFileNamesForConvert.length === 1
            ? selectedFileNamesForConvert[0]
            : undefined
        }
        mindspaceFileId={
          selectedFileIdsForConvert.length === 1
            ? selectedFileIdsForConvert[0]
            : undefined
        }
        // Bulk file props
        fileNames={selectedFileNamesForConvert}
        mindspaceFileIds={selectedFileIdsForConvert}
        onSuccess={() => {
          fetchDocuments(); // Refresh list
          // logic from MindspaceTabContent context tracking could be added here if needed
        }}
      />
    </div>
  );
};

export default Mindspace;
