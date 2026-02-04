import { ControlButton } from '@/components/ui/ControlButton';
import { FileTypeFilter } from '@/components/ui/FileTypeFilter';
import { SortFilter } from '@/components/ui/SortFilter';
import { UniversalDialog } from '@/components/ui/UniversalDialog';
import { LoopOpsSidebarLeft } from '@/components/ui/loopops-branding/LoopOpsSidebarLeft';
import { WalkthroughInfo } from '@/components/walkthrough/WalkthroughInfo';
import { WalkthroughOverlay } from '@/components/walkthrough/WalkthroughOverlay';
import { STORAGE_KEYS } from '@/constants/storageKeys';
import { useAuth } from '@/contexts/AuthContext';
import { useSidebarWidth } from '@/contexts/SidebarWidthContext';
import { useMessageStore } from '@/features/chat/stores/messageStore';
import { useRunEventsStore } from '@/features/chat/stores/runEventsStore';
import { useSessionStore } from '@/features/chat/stores/sessionStore';
import { useUIStore } from '@/features/chat/stores/uiStore';
import { useToast } from '@/hooks/use-toast';
import { useBulkActions } from '@/hooks/useBulkActions';
import { useAvailableProjects } from '@/hooks/useCurrentProject';
import { useFileFilters } from '@/hooks/useFileFilters';
import { useMetadataExtraction } from '@/hooks/useMetadataExtraction';
import { useProjectContextFileUpload } from '@/hooks/useProjectContextFileUpload';
import { useStageTemplate } from '@/hooks/useStageTemplate';
import { useWalkthrough } from '@/hooks/useWalkthrough';
import { ProjectContextDocument } from '@/models/ProjectContextDocument';
import { useCreateOrGetSession } from '@/queries/sessionNavigationQueries';
import {
  useCanCreateProject,
  useCreateProjectMutation,
  useStagesQuery,
  useWorkspaceProjectsQuery,
} from '@/queries/workspaceProjectQueries';
import { ProjectStageService } from '@/services/ProjectStageService';
import { StorageService } from '@/services/StorageService';
import { UserPreferencesService } from '@/services/UserPreferencesService';
import {
  useStages,
  useWorkspaceProjectStore,
} from '@/stores/workspaceProjectStore';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { queryClient } from '../../lib/queryClient';
import { ReviewFile } from '../review-files/ReviewFileItem';
import { ReviewFiles } from '../review-files/ReviewFiles';
import { ProcessingFilesOverlay } from '../ui/ProcessingFilesOverlay';
import { ProjectNewModal } from '../workspace/ProjectNewModal';
import { ArtifactsTabDisplay } from './ArtifactsTabDisplay';
import { AssetsTabDisplay } from './AssetsTabDisplay';
import { ContextHeader } from './ContextHeader';
import { ConvertToDeliverableModal } from './ConvertToDeliverableModal';
import { ProjectContext2Section } from './ProjectContext2Section';
import { ProjectItem } from './ProjectContextTypes';
import { TabNavigationControl, TabType } from './TabNavigationControl';
import { TabNavigationSkeleton } from './TabNavigationSkeleton';
import { createProjectContextWalkthroughSteps } from './projectContextWalkthroughHelpers';

const ProjectContextPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const stages = useStages();
  const [activeTab, setActiveTab] = useState<TabType>('artifacts');

  const { user, preferencesLoaded } = useAuth();
  const { toast } = useToast();
  const createOrGetSession = useCreateOrGetSession();

  // const [activeStageAction, setActiveStageAction] = useState<string>('files');

  // State for file filtering and sorting
  const [selectedFileType, setSelectedFileType] = useState<string>('all');
  const [selectedSort, setSelectedSort] = useState<string>('newest-to-oldest');

  // State for bulk actions
  const [selectedFilesCount, setSelectedFilesCount] = useState<number>(0);
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  const [refreshKey, setRefreshKey] = useState<number>(0);

  // State for ConvertToDeliverableModal
  const [isConvertToDeliverableModalOpen, setIsConvertToDeliverableModalOpen] =
    useState(false);
  const [selectedFileNames, setSelectedFileNames] = useState<string[]>([]);
  const [selectedFileMetadata, setSelectedFileMetadata] = useState<
    Array<{ id: string; title: string }>
  >([]);

  // Use the file filters hook
  const { fileTypeOptions, sortOptions } = useFileFilters({
    onFileTypeChange: (fileType) => {
      setSelectedFileType(fileType);
    },
    onSortChange: (sortBy) => {
      setSelectedSort(sortBy);
    },
  });

  // Initialize as false, will be updated after preferences are loaded from DB
  const [walkthroughCompleted, setWalkthroughCompleted] = useState(false);

  // Update walkthrough completion status after preferences are synced from database
  useEffect(() => {
    if (preferencesLoaded) {
      const completed =
        StorageService.getItem<boolean>(
          STORAGE_KEYS.PROJECT_CONTEXT_WALKTHROUGH_COMPLETED,
          'local',
        ) || false;
      setWalkthroughCompleted(completed);
    }
  }, [preferencesLoaded]);

  const settingsButtonRef = useRef<HTMLDivElement>(null);
  const tabNavigationRef = useRef<HTMLDivElement>(null);
  const stageActionsRef = useRef<HTMLDivElement>(null);
  const sessionIdRef = useRef<string | null>(null);

  // State for ReviewFiles modal
  const [isReviewFilesModalOpen, setIsReviewFilesModalOpen] = useState(false);
  const [reviewFiles, setReviewFiles] = useState<ReviewFile[]>([]);
  const [isConfirmingFiles, setIsConfirmingFiles] = useState(false);

  // State for Project Creation modal
  const [isProjectCreationModalOpen, setIsProjectCreationModalOpen] =
    useState(false);

  // State for ProjectSelector
  const [isProjectSelectorOpen, setIsProjectSelectorOpen] = useState(false);
  const [highlightProjectId, setHighlightProjectId] = useState<string | null>(
    null,
  );

  // Metadata extraction hook
  const { extractMetadata } = useMetadataExtraction();
  const processContextFiles = async (
    files: ReviewFile[],
    updateDocumentFn?: (
      id: string,
      updates: Partial<ProjectContextDocument>,
    ) => void,
  ) => {
    setIsConfirmingFiles(true);
    try {
      // Split files into two batches: shared with workspace and private to project
      const sharedWithWorkspaceFiles = files.filter(
        (f) => f.shareWithWorkspace,
      );
      const privateFiles = files.filter((f) => !f.shareWithWorkspace);

      // Results aggregator
      const allResults: any[] = [];
      let hasFailures = false;

      // Process batch 1: Shared files (send workspace_id)
      // Note: Files are already uploaded to stage bucket, just need KB processing
      if (sharedWithWorkspaceFiles.length > 0) {
        const filesPayload = sharedWithWorkspaceFiles.map((f) => ({
          id: f.id,
          summary: f.summary,
          tags: f.keywords
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean),
          category: f.category,
        }));

        const processResult =
          await ProjectStageService.bulkProcessStageFilesForKnowledgeBase(
            filesPayload,
          );

        if (
          !processResult.success &&
          processResult.summary?.failed === processResult.summary?.total
        ) {
          hasFailures = true;
        }
        if (processResult.results) allResults.push(...processResult.results);
      }

      // Process batch 2: Private files (same processing, files already in stage)
      if (privateFiles.length > 0) {
        const filesPayload = privateFiles.map((f) => ({
          id: f.id,
          summary: f.summary,
          tags: f.keywords
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean),
          category: f.category,
        }));

        const processResult =
          await ProjectStageService.bulkProcessStageFilesForKnowledgeBase(
            filesPayload,
          );

        if (
          !processResult.success &&
          processResult.summary?.failed === processResult.summary?.total
        ) {
          hasFailures = true;
        }
        if (processResult.results) allResults.push(...processResult.results);
      }

      if (hasFailures && allResults.every((r) => !r.success)) {
        throw new Error('Failed to copy files to stage');
      }

      // Update progress to 100% for all processed files if function is provided
      if (updateDocumentFn) {
        files.forEach((f) => {
          updateDocumentFn(f.id, { uploadProgress: 100 });
        });
        // Small delay to let user see the 100% progress
        await new Promise((resolve) => setTimeout(resolve, 800));
      }

      setIsReviewFilesModalOpen(false);
      // Clear the uploaded documents and review files
      clearDocuments();
      setReviewFiles([]);
      // Trigger refresh of ProjectTabContent to reload files
      setRefreshKey((prev) => prev + 1);
      toast({
        title: 'Files processed successfully',
        description: 'Files have been added to the project stage.',
      });
    } catch (error) {
      console.error('Error in handleReviewFilesConfirm:', error);

      // Cleanup on error: delete the uploaded files
      try {
        const fileIds = files.map((f) => f.id);
        console.log('Cleaning up files due to processing error:', fileIds);
        await ProjectStageService.bulkDeleteProjectFiles(fileIds);
      } catch (cleanupError) {
        console.error('Failed to cleanup files after error:', cleanupError);
      }

      // Reset state
      setReviewFiles([]);
      clearDocuments();
      setIsReviewFilesModalOpen(false);

      toast({
        title: 'Processing failed',
        description:
          error instanceof Error
            ? error.message
            : 'Failed to process files. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsConfirmingFiles(false);
    }
  };

  // Ref to access clearDocuments inside the callback
  const clearDocumentsRef = useRef<() => void>();

  // File upload hook with callback
  const {
    fileInputRef,
    handleFileSelect,
    triggerFileSelect,
    documents: uploadingDocuments,
    updateDocument,
    clearDocuments,
  } = useProjectContextFileUpload({
    extractMetadata,
    onUploadComplete: async (docs, updateDocCallback) => {
      const isOnboardingStage = activeStage?.name === 'Onboarding';

      // Clear the uploading documents overlay immediately if we are going to show another modal
      // This prevents the "Processing" overlay from persisting over the Review dialog
      if (clearDocumentsRef.current) {
        clearDocumentsRef.current();
      }

      if (isOnboardingStage) {
        // Use metadata directly from uploaded docs (extracted by the edge function)
        // Convert to ReviewFile format
        const initialReviewFiles: ReviewFile[] = docs.map((doc) => ({
          id: doc.id,
          fileName: doc.fileName,
          category: doc.category,
          project: selectedProject?.name,
          summary: doc.summary || '',
          keywords: doc.tags?.join(', ') || '',
          shareWithWorkspace: false,
          hasMissingInfo:
            !doc.category || !doc.summary || !doc.tags || doc.tags.length === 0,
        }));

        setReviewFiles(initialReviewFiles);
        setIsReviewFilesModalOpen(true);
      } else {
        // Normal upload flow for non-onboarding stages
        const initialReviewFiles: ReviewFile[] = docs.map((doc) => ({
          id: doc.id,
          fileName: doc.fileName,
          category: doc.category,
          project: selectedProject?.name,
          summary: doc.summary || '',
          keywords: doc.tags?.join(', ') || '',
          shareWithWorkspace: false,
          hasMissingInfo:
            !doc.category || !doc.summary || !doc.tags || doc.tags.length === 0,
        }));

        await processContextFiles(initialReviewFiles, updateDocCallback);
      }
    },
  });

  // Assign the ref so it can be used inside the callback
  clearDocumentsRef.current = clearDocuments;

  useEffect(() => {
    const stageParam = searchParams.get('stage');
    const sessionIdParam = searchParams.get('session_id');

    if (stageParam) {
      // Ignore stage param for tab selection as we now use static tabs
    }

    if (sessionIdParam) {
      sessionIdRef.current = sessionIdParam;
    }
  }, [searchParams]);

  const fileViewerRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Use unified workspace project store
  const currentWorkspace = useWorkspaceProjectStore((state) =>
    state.getCurrentWorkspace(),
  );
  const selectedProject = useWorkspaceProjectStore((state) =>
    state.getCurrentProject(),
  );
  const availableWorkspaces = useWorkspaceProjectStore(
    (state) => state.workspaces,
  );
  const setCurrentWorkspaceId = useWorkspaceProjectStore(
    (state) => state.setCurrentWorkspaceId,
  );
  const setCurrentProjectId = useWorkspaceProjectStore(
    (state) => state.setCurrentProjectId,
  );

  // Use React Query for data fetching (auto-syncs with store)
  // useWorkspaceProjectsQuery fetches workspaces AND projects in one call via get-workspace-projects edge function
  const { isLoading: workspacesAndProjectsLoading } = useWorkspaceProjectsQuery();
  const workspacesLoading = workspacesAndProjectsLoading;
  const isLoadingProjects = workspacesAndProjectsLoading;

  // We default to the first stage for context if needed, but navigation is now independent
  const activeStage = stages.length > 0 ? stages[0] : null; // Fallback to first stage for logic needing a stage

  // Data fetching
  const { isLoading: stagesLoading } = useStagesQuery();
  const availableProjects = useAvailableProjects();

  // Mutation for creating new projects
  const createProjectMutation = useCreateProjectMutation();

  // Check if user can create projects (owner only)
  const canCreateProject = useCanCreateProject();

  const {
    stageTemplate,
    isLoadingStageTemplate,
    error: stageTemplateError,
  } = useStageTemplate(activeStage?.project_stage_id);

  const handleWorkspaceChange = async (workspaceId: string) => {
    try {
      // Use the unified store to switch workspace
      setCurrentWorkspaceId(workspaceId);
    } catch (error) {
      console.error('Error switching workspace:', error);
      toast({
        title: 'Error',
        description: 'Failed to switch workspace.',
        variant: 'destructive',
      });
    }
  };

  // Handle project changes
  const handleProjectChange = async (projectId: string) => {
    try {
      // Clear all chat-related stores to prevent data from previous project
      useRunEventsStore.getState().clearAllEvents();
      useUIStore.getState().clearAllSessions();
      useSessionStore.getState().clearStore();
      useMessageStore.getState().clearAllMessages();

      // Remove cached session data to prevent false positives
      queryClient.removeQueries({
        predicate: (query) => {
          const key = query.queryKey[0];
          return (
            typeof key === 'string' &&
            (key.includes('session') ||
              key === 'sessions-all' ||
              key === 'stage-sessions' ||
              key === 'agno-sessions')
          );
        },
      });

      // Use the unified store to switch project
      setCurrentProjectId(projectId);

      // Invalidate and refetch stages for the new project
      queryClient.invalidateQueries({
        queryKey: ['stages', 'list', projectId],
      });

      // Reset current stage since we're switching projects
      // The useStagesQuery will auto-select the first stage of the new project
      const setCurrentStageId =
        useWorkspaceProjectStore.getState().setCurrentStageId;
      setCurrentStageId(null);
    } catch (error) {
      console.error('Error switching project:', error);
      // Silently fail - error is already handled in store
    }
  };

  // Handle create new project button click
  const handleCreateNewProject = () => {
    setIsProjectCreationModalOpen(true);
  };

  // Handle project creation
  const handleProjectCreation = async (projectData: {
    name: string;
    description?: string;
  }): Promise<boolean> => {
    try {
      // Use the React Query mutation for project creation
      await createProjectMutation.mutateAsync({
        name: projectData.name,
        description: projectData.description,
      });

      // Close modal
      setIsProjectCreationModalOpen(false);

      // The mutation handles:
      // - Invalidating queries to refetch projects
      // - Selecting the new project via setCurrentProjectId
      // - Showing success toast

      // Highlight the new project in the selector
      const projects = useWorkspaceProjectStore.getState().projects;
      const newProject = projects.find((p) => p.name === projectData.name);
      if (newProject) {
        setHighlightProjectId(newProject.id);
        setIsProjectSelectorOpen(true);

        // Clear highlight after animation completes
        setTimeout(() => {
          setHighlightProjectId(null);
        }, 1500);
      }

      return true;
    } catch (error) {
      console.error('Error creating project:', error);
      // Error toast is handled by the mutation
      return false;
    }
  };

  // Initialize active tab logic removed as we default to 'assets'
  // and no longer sync stage ID with tab ID for main navigation

  // Handle tab changes
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    // Clear selection when changing tabs
    setSelectedFilesCount(0);
    setSelectedFileIds([]);
    setSelectedFileMetadata([]);
    // Force refresh key to update child components
    setRefreshKey((prev) => prev + 1);
  };

  // handleStageActionChange removed

  // Handle selected files change from ProjectTabContent
  const handleSelectedFilesChange = useCallback(
    (
      ids: string[],
      count: number,
      metadata: Array<{ id: string; title: string }>,
    ) => {
      setSelectedFilesCount(count);
      setSelectedFileIds(ids);
      setSelectedFileMetadata(metadata);
    },
    [],
  );

  // Handle fetching items for stage and action type
  const handleFetchItems = useCallback(
    async (
      _stageId: number, // Unused
      _actionType: string, // Unused (derived from activeTab)
    ): Promise<ProjectItem[]> => {
      const projectId = selectedProject?.id;

      if (!projectId) {
        return [];
      }

      // Always fetch assets
      const response = await ProjectStageService.getProjectAssets(projectId);

      // Filter if needed
      if (activeTab === 'artifacts') {
        const artifacts = response.filter((item) => item.isDeliverable);
        return artifacts;
      }

      return response;
    },
    [selectedProject?.id, activeTab],
  );

  // Bulk actions hook
  const {
    handleBulkDownload,
    handleBulkDelete,
    handleStartLoop,
    handleBulkDeleteDeliverables,
    handleBulkDownloadDeliverables,
    isBulkDownloading,
    isBulkDeleting,
  } = useBulkActions({
    selectedFileIds,
    selectedFilesCount,
    selectedFileMetadata,
    stages,
    activeTabId: 0,
    onFetchItems: handleFetchItems,
    onSelectionClear: () => {
      setSelectedFilesCount(0);
      setSelectedFileIds([]);
    },
    onRefresh: () => setRefreshKey((prev) => prev + 1),
    onConvertToDeliverable: (fileNames) => {
      setSelectedFileNames(fileNames);
      setIsConvertToDeliverableModalOpen(true);
    },
  });

  // Compute dynamic ProjectContext2Section data
  const projectContextData = useMemo(() => {
    const workspaceName = currentWorkspace?.name || 'Workspace';
    const projectName = selectedProject?.name || 'App';
    // Use active stage if available, otherwise fall back to first stage
    // const activeStage = stages.length > 0 ? stages[0] : null;
    // const stageName = activeStage?.name || 'Onboard';

    return [
      {
        emoji: null,
        title: `Welcome to the ${workspaceName} ${projectName} Workspace`,
        description:
          'View your Project Artifacts, or upload files or assets to give LoopOps context about your product.',
        description2: null,
        buttonText: `Start a Loop`,
      },
    ];
  }, [currentWorkspace?.name, selectedProject?.name]);

  const currentProjectData = projectContextData[0];

  // Create walkthrough steps using helper function
  const walkthroughSteps = createProjectContextWalkthroughSteps(
    {
      settingsButtonRef,
      tabNavigationRef,
      stageActionsRef,
      fileViewerRef,
      sidebarRef,
    },
    {
      onNextStep: () => walkthrough.nextStep(),
      onSkipWalkthrough: () => {
        walkthrough.skipWalkthrough();
        setWalkthroughCompleted(true);
        UserPreferencesService.completeWalkthrough('project_context');
      },
      onFinishWalkthrough: () => {
        walkthrough.skipWalkthrough();
        setWalkthroughCompleted(true);
        StorageService.setItem(
          STORAGE_KEYS.PROJECT_CONTEXT_WALKTHROUGH_COMPLETED,
          true,
          'local',
        );
        UserPreferencesService.completeWalkthrough('project_context');
      },
      onSkipToFinalStep: () => walkthrough.skipToFinalStep(),
    },
  );

  const walkthrough = useWalkthrough(walkthroughSteps);

  // Helper function to handle review files confirmation
  const handleReviewFilesConfirm = async (files: ReviewFile[]) => {
    await processContextFiles(files, updateDocument);
  };

  const handleStartSession = async () => {
    if (!stageTemplate) {
      toast({
        title: 'Template Not Available',
        description:
          stageTemplateError ||
          'The stage template is not available. Please contact support.',
        variant: 'destructive',
      });
      return;
    }

    if (!user?.id || !currentWorkspace?.id) {
      toast({
        title: 'Session Error',
        description: 'User or workspace not available. Please try again.',
        variant: 'destructive',
      });
      return;
    }

    const currentActiveStage =
      activeStage || (stages.length > 0 ? stages[0] : null);

    if (!currentActiveStage?.project_stage_id) {
      toast({
        title: 'Stage Error',
        description: 'No valid stage found. Please refresh the page.',
        variant: 'destructive',
      });
      return;
    }

    if (walkthrough.isActive) {
      walkthrough.skipWalkthrough();
      setWalkthroughCompleted(true);
      StorageService.setItem(
        STORAGE_KEYS.PROJECT_CONTEXT_WALKTHROUGH_COMPLETED,
        true,
        'local',
      );
      UserPreferencesService.completeWalkthrough('project_context');
    }

    if (!walkthroughCompleted) {
      setWalkthroughCompleted(true);
      StorageService.setItem(
        STORAGE_KEYS.PROJECT_CONTEXT_WALKTHROUGH_COMPLETED,
        true,
        'local',
      );
      UserPreferencesService.completeWalkthrough('project_context');
    }

    try {
      const result = await createOrGetSession.mutateAsync({
        userId: user.id,
        workspaceId: currentWorkspace.id,
        projectId: selectedProject?.id,
        projectStageId: currentActiveStage.project_stage_id,
        stageId: currentActiveStage.id,
      });

      const sessionId = result.sessionId;

      if (!sessionId) {
        throw new Error('No session ID returned from createOrGetSession');
      }

      await queryClient.invalidateQueries({
        queryKey: [
          'agno-sessions',
          currentWorkspace.id,
          selectedProject?.id,
          user.id,
          stageTemplate.id,
        ],
      });

      const stagePriority =
        currentActiveStage.priority?.toString() ||
        currentActiveStage.id.toString();

      const params = new URLSearchParams();
      params.set('stage', stagePriority);
      params.set('session_id', sessionId);

      const navigationUrl = `/chat?${params.toString()}`;

      navigate(navigationUrl);
    } catch (error) {
      console.error('Error creating session:', error);
      toast({
        title: 'Error',
        description: 'Failed to start chat session. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const { leftSidebarWidth } = useSidebarWidth();

  return (
    <div
      className="min-h-screen h-screen w-full bg-neutral-grayscale-0 flex overflow-hidden"
      data-testid="project-context-page"
    >
      {/* Fixed Right Sidebar */}
      <LoopOpsSidebarLeft ref={sidebarRef} />
      {/* Main content area with responsive layout */}
      <div
        className="flex-1 flex min-w-0 overflow-hidden transition-all duration-300 ease-in-out"
        style={{ paddingLeft: `${leftSidebarWidth}px` }}
      >
        {/* Section 1: Files and Notes List (860px = 60.06% of 1432px total) */}
        <div
          className="@container bg-white flex flex-col flex-shrink-0 p-loop-6 min-w-0"
          style={{ width: '60%' }}
        >
          <div className="mb-loop-10">
            <div className="flex items-center gap-loop-2 text-2xl">
              <h1 className="font-bold text-neutral-grayscale-90">
                {workspacesLoading ? 'Loading...' : currentWorkspace?.name}
              </h1>
              <p className="text-neutral-grayscale-60">LoopOps Hub</p>
            </div>
          </div>
          {/* Header - Fixed */}
          <div className="flex flex-col flex-shrink-0 space-y-loop-8">
            {/* Second Row: Context Header with Workspace/Project Selectors */}
            <ContextHeader
              currentWorkspace={currentWorkspace}
              availableWorkspaces={availableWorkspaces}
              workspacesLoading={workspacesLoading}
              onWorkspaceChange={handleWorkspaceChange}
              selectedProject={selectedProject}
              availableProjects={availableProjects}
              isLoadingProjects={isLoadingProjects}
              isProjectSelectorOpen={isProjectSelectorOpen}
              onProjectSelectorOpenChange={setIsProjectSelectorOpen}
              onProjectChange={handleProjectChange}
              onCreateNewProject={handleCreateNewProject}
              highlightProjectId={highlightProjectId}
              canCreateProject={canCreateProject}
            />

            {/* Third Row: Category Navigation Tabs */}
            <div ref={tabNavigationRef} data-testid="project-context-tabs">
              {stagesLoading ? (
                <TabNavigationSkeleton />
              ) : (
                <TabNavigationControl
                  activeTab={activeTab}
                  onTabChange={handleTabChange}
                />
              )}
            </div>

            {stagesLoading ? (
              <div dangerouslySetInnerHTML={{ __html: '' }} />
            ) : (
              activeStage && (
                <>
                  {/* Title/Description and Filter Controls Row */}
                  <div className="flex flex-col @[715px]:flex-row @[715px]:items-center justify-between gap-loop-10 mb-loop-10">
                    {/* Left Side: Title and Description */}
                    <div className="flex flex-col items-start justify-center">
                      <h2 className="text-2xl font-bold">
                        {activeTab === 'artifacts'
                          ? 'Project Artifacts'
                          : 'Project Assets'}
                      </h2>
                      <p className="text-neutral-grayscale-60 text-lg">
                        {activeTab === 'artifacts' ? (
                          <>
                            Artifacts are documents generated by you and your
                            team. They are shared with everyone in this project.
                          </>
                        ) : (
                          <>
                            These Files are indexed by LoopOps’ AI, and used as
                            knowledge base for the project.
                          </>
                        )}
                      </p>
                    </div>

                    {/* Right Side: Filter and Sort Controls */}
                    <div className="flex items-center justify-end space-x-loop-2 flex-shrink-0">
                      {activeTab === 'assets' && (
                        <ControlButton
                          type="transparent"
                          size="md"
                          fontSize={11}
                          text="Upload Files"
                          onClick={() => {
                            triggerFileSelect();
                          }}
                          data-testid="project-context-upload-files-btn"
                        />
                      )}
                      <FileTypeFilter
                        options={fileTypeOptions}
                        dropdownAlign="end"
                      />
                      <SortFilter options={sortOptions} dropdownAlign="end" />
                    </div>
                  </div>
                </>
              )
            )}
          </div>

          {/* Tab Content Section - Takes remaining height */}
          <div className="flex-1 min-h-0 !mt-loop-10">
            {!stagesLoading &&
              (activeTab === 'assets' ? (
                <AssetsTabDisplay
                  key={refreshKey}
                  selectedFileType={selectedFileType}
                  selectedSort={selectedSort}
                  onSelectedFilesChange={handleSelectedFilesChange}
                />
              ) : (
                <ArtifactsTabDisplay
                  key={refreshKey}
                  stages={stages}
                  onSelectedFilesChange={handleSelectedFilesChange}
                />
              ))}
          </div>

          {/* Hidden file input for uploads */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.png,.jpg,.jpeg,.docx,.txt,.md"
            onChange={(e) => {
              if (activeStage?.project_stage_id) {
                handleFileSelect(e.target.files, activeStage.project_stage_id);
                // Reset input so same file can be selected again
                e.target.value = '';
              }
            }}
            className="hidden"
          />
        </div>

        {/* Section 2: File Editor or Welcome Section */}

        <ProjectContext2Section
          ref={fileViewerRef}
          data={currentProjectData}
          isLoading={createOrGetSession.isPending || isLoadingStageTemplate}
          buttonAction={handleStartSession}
          // Bulk Actions
          selectedFilesCount={selectedFilesCount}
          onDownloadSelected={
            activeTab === 'assets'
              ? handleBulkDownload
              : handleBulkDownloadDeliverables
          }
          onDeleteSelected={
            activeTab === 'assets'
              ? handleBulkDelete
              : handleBulkDeleteDeliverables
          }
          onStartLoop={handleStartLoop}
          onClearSelection={() => {
            setSelectedFilesCount(0);
            setSelectedFileIds([]);
            // Also need to clear in the child list components if possible,
            // but for now this clears the parent state.
            // Ideally we should pass a prop to AssetsTabDisplay/ArtifactsTabDisplay to clear their internal selection if needed
            // or better yet, lift the selection state up entirely (which it seems to be partially).
            // The list components have 'onSelectedFilesChange' but don't seem to take 'selectedIds' as a prop
            // to control external selection clearing except via key refresh.
            setRefreshKey((prev) => prev + 1);
          }}
          isBulkDownloading={isBulkDownloading}
          isBulkDeleting={isBulkDeleting}
        />
      </div>

      {/* Walkthrough System */}
      {!walkthroughCompleted && preferencesLoaded && !walkthrough.isActive && (
        <WalkthroughOverlay
          title={`✨ ${selectedProject?.name || 'App'} project created ✨`}
          description="Let's take a quick look around your workspace and start adding the essentials."
          isVisible={true}
          secondaryButton={{
            title: 'Skip Tour',
            action: () => {
              walkthrough.skipWalkthrough();
              setWalkthroughCompleted(true);
              StorageService.setItem(
                STORAGE_KEYS.PROJECT_CONTEXT_WALKTHROUGH_COMPLETED,
                true,
                'local',
              );
              UserPreferencesService.completeWalkthrough('project_context');
            },
          }}
          primaryButton={{
            title: 'Show me around',
            action: () => walkthrough.startWalkthrough(),
          }}
        />
      )}

      {/* Walkthrough Step Info */}
      {walkthrough.isActive && walkthrough.currentStep && (
        <WalkthroughInfo
          title={walkthrough.currentStep.title}
          description={walkthrough.currentStep.description}
          targetRef={walkthrough.currentStep.targetRef}
          placement={walkthrough.currentStep.placement}
          offset={walkthrough.currentStep.offset}
          centered={walkthrough.currentStep.centered}
          primaryButton={walkthrough.currentStep.primaryButton}
          secondaryButton={walkthrough.currentStep.secondaryButton}
          className={walkthrough.currentStep.className}
          animation={walkthrough.currentStep.animation}
        />
      )}

      {/* ReviewFiles Modal */}
      {isReviewFilesModalOpen && (
        <UniversalDialog
          open={isReviewFilesModalOpen}
          onOpenChange={async (open) => {
            // If closing the dialog (open === false) and files haven't been confirmed,
            // clean up the uploaded files
            if (!open && reviewFiles.length > 0) {
              try {
                // Extract file IDs from reviewFiles
                const fileIds = reviewFiles.map((file) => file.id);

                // Call service to delete uploaded files
                await ProjectStageService.bulkDeleteProjectFiles(fileIds);
                console.log('Successfully cleaned up uploaded files');
              } catch (error) {
                console.error('Error cleaning up uploaded files:', error);
              }
            }

            setIsReviewFilesModalOpen(open);
            if (!open) {
              setReviewFiles([]);
              clearDocuments();
            }
          }}
          title=""
          showLogo={false}
          fullScreen={true}
          allowChildControl={true}
          closeButtonStyle={{ color: 'var(--neutral-grayscale-90)' }}
        >
          <ReviewFiles
            initialFiles={reviewFiles}
            onClose={() => setIsReviewFilesModalOpen(false)}
            isProcessing={isConfirmingFiles}
            onConfirm={handleReviewFilesConfirm}
            showCloseButton={false}
          />
        </UniversalDialog>
      )}

      {/* Project Creation Modal */}
      <ProjectNewModal
        open={isProjectCreationModalOpen}
        onOpenChange={setIsProjectCreationModalOpen}
        onCreateProject={handleProjectCreation}
      />

      {/* Convert to Deliverable Modal */}
      <ConvertToDeliverableModal
        open={isConvertToDeliverableModalOpen}
        onOpenChange={setIsConvertToDeliverableModalOpen}
        fileNames={selectedFileNames}
        itemIds={selectedFileIds}
        onSuccess={() => {
          // Clear selection and refresh
          setSelectedFilesCount(0);
          setSelectedFileIds([]);
          setSelectedFileNames([]);
          setRefreshKey((prev) => prev + 1);
          // Clear uploaded documents to trigger a refresh
          clearDocuments();
        }}
      />

      {/* File Upload Loading Overlay */}
      {/* File Upload Loading Overlay */}
      <ProcessingFilesOverlay uploadingDocuments={uploadingDocuments} />
    </div>
  );
};

export default ProjectContextPage;
