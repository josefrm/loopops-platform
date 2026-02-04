import { IntegrationsLayout } from '@/components/integrations/IntegrationsLayout';
import { ContextHeader } from '@/components/projectContext/ContextHeader';
import { LoopOpsSidebarLeft } from '@/components/ui/loopops-branding/LoopOpsSidebarLeft';
import { ProjectNewModal } from '@/components/workspace/ProjectNewModal';
import { useSidebarWidth } from '@/contexts/SidebarWidthContext';
import { useRunEventsStore } from '@/features/chat/stores/runEventsStore';
import { useSessionStore } from '@/features/chat/stores/sessionStore';
import { useUIStore } from '@/features/chat/stores/uiStore';
import { useToast } from '@/hooks/use-toast';
import {
  useAvailableProjects,
  useProjectLoading,
} from '@/hooks/useCurrentProject';
import { queryClient } from '@/lib/queryClient';
import {
  useCreateProjectMutation,
  useWorkspaceProjectsQuery,
} from '@/queries/workspaceProjectQueries';
import { useIntegrationsStore } from '@/stores/integrationsStore';
import { useWorkspaceProjectStore } from '@/stores/workspaceProjectStore';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

const IntegrationScreen = () => {
  const [searchParams] = useSearchParams();
  const setActiveTab = useIntegrationsStore((state) => state.setActiveTab);
  const { leftSidebarWidth } = useSidebarWidth();
  const { toast } = useToast();

  // State for Project Creation modal
  const [isProjectCreationModalOpen, setIsProjectCreationModalOpen] =
    useState(false);

  // State for ProjectSelector
  const [isProjectSelectorOpen, setIsProjectSelectorOpen] = useState(false);
  const [highlightProjectId, setHighlightProjectId] = useState<string | null>(
    null,
  );

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
  const { isLoading: workspacesLoading } = useWorkspaceProjectsQuery();

  // Data fetching
  const availableProjects = useAvailableProjects();
  const isLoadingProjects = useProjectLoading();

  // Mutation for creating new projects
  const createProjectMutation = useCreateProjectMutation();

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'knowledge-base' || tab === 'integrations') {
      setActiveTab(tab);
    }
  }, [searchParams, setActiveTab]);

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
      useRunEventsStore.getState().clearAllEvents();
      useUIStore.getState().clearAllSessions();
      useSessionStore.getState().clearStore();

      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey[0];
          return (
            typeof key === 'string' &&
            (key.includes('session') || key === 'sessions-all')
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

  return (
    <div className="min-h-screen h-screen w-full bg-neutral-grayscale-0 flex overflow-hidden">
      {/* Fixed Left Sidebar */}
      <LoopOpsSidebarLeft />

      {/* Main content area with responsive layout */}
      <div
        className="flex-1 flex flex-col min-w-0 overflow-hidden transition-all duration-300 ease-in-out"
        style={{ paddingLeft: `${leftSidebarWidth}px` }}
      >
        <div className="flex-1 overflow-y-auto">
          {/* Main Content Section */}
          <div className="bg-white flex flex-col p-loop-6 min-w-0 space-y-loop-10 max-w-7xl mx-auto w-full">
            <div className="">
              <div className="flex items-center gap-loop-2 text-2xl">
                <h1 className="font-bold text-neutral-grayscale-90">
                  {workspacesLoading ? 'Loading...' : currentWorkspace?.name}
                </h1>
                <p className="text-neutral-grayscale-60">Integrations</p>
              </div>
            </div>

            {/* Header - Fixed */}
            <div className="flex flex-col flex-shrink-0 space-y-loop-8">
              {/* Context Header with Workspace/Project Selectors */}
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
              />
            </div>

            {/* Content Section */}
            <IntegrationsLayout />
          </div>
        </div>
      </div>

      {/* Project Creation Modal */}
      <ProjectNewModal
        open={isProjectCreationModalOpen}
        onOpenChange={setIsProjectCreationModalOpen}
        onCreateProject={handleProjectCreation}
      />
    </div>
  );
};

export default IntegrationScreen;
