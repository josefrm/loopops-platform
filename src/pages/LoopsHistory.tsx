import { ProjectContext2Section } from '@/components/projectContext/ProjectContext2Section';
import { LoopOpsSidebarLeft } from '@/components/ui/loopops-branding/LoopOpsSidebarLeft';
import { ProjectNewModal } from '@/components/workspace/ProjectNewModal';
import { useAuth } from '@/contexts/AuthContext';
import { useSidebarWidth } from '@/contexts/SidebarWidthContext';
import { useToast } from '@/hooks/use-toast';
import { useFileFilters } from '@/hooks/useFileFilters';
import { useStageTemplate } from '@/hooks/useStageTemplate';
import { useCreateOrGetSession } from '@/queries/sessionNavigationQueries';
import {
  useCreateProjectMutation,
  useStagesQuery,
  useWorkspaceProjectsQuery,
} from '@/queries/workspaceProjectQueries';
import {
  useStages,
  useWorkspaceProjectStore,
} from '@/stores/workspaceProjectStore';
import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ExternalLoopsDisplay } from '../components/projectContext/ExternalLoopsDisplay';
import { InternalLoopsDisplay } from '../components/projectContext/InternalLoopsDisplay';
import { ControlButton } from '../components/ui/ControlButton';
import { SortFilter } from '../components/ui/SortFilter';

const LoopsHistory = () => {
  const stages = useStages();
  const { user } = useAuth();
  const { toast } = useToast();
  const { leftSidebarWidth } = useSidebarWidth();
  const navigate = useNavigate();

  const [viewMode, setViewMode] = useState<'internal' | 'external'>('internal');

  // Use the file filters hook for sort options
  // Internal view supports "Group by Stage", External view does not.
  const { sortOptions, activeSortBy } = useFileFilters({
    initialSortBy:
      viewMode === 'internal' ? 'group-by-stage' : 'newest-to-oldest',
    additionalSortOptions:
      viewMode === 'internal'
        ? [
            {
              name: 'Loops per Stage',
              value: 'group-by-stage',
              action: () => {}, // Handled by useFileFilters state update
            },
          ]
        : [],
  });
  const createOrGetSession = useCreateOrGetSession();
  const fileViewerRef = useRef<HTMLDivElement>(null);

  // State for Project Creation modal
  const [isProjectCreationModalOpen, setIsProjectCreationModalOpen] =
    useState(false);
  // Use unified workspace project store
  const currentWorkspace = useWorkspaceProjectStore((state) =>
    state.getCurrentWorkspace(),
  );
  const selectedProject = useWorkspaceProjectStore((state) =>
    state.getCurrentProject(),
  );
  // Get the first stage for LoopsTabContent (it needs a stage)
  const activeStage = stages.length > 0 ? stages[0] : null;

  // Data fetching
  useStagesQuery();
  const { isLoading: workspacesLoading } = useWorkspaceProjectsQuery();

  // Mutation for creating new projects
  const createProjectMutation = useCreateProjectMutation();

  const {
    stageTemplate,
    isLoadingStageTemplate,
    error: stageTemplateError,
  } = useStageTemplate(activeStage?.project_stage_id);

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

      return true;
    } catch (error) {
      console.error('Error creating project:', error);
      // Error toast is handled by the mutation
      return false;
    }
  };

  // Compute dynamic ProjectContext2Section data
  const loopsContextData = useMemo(() => {
    const projectName = selectedProject?.name || 'App';
    const stageName = activeStage?.name || 'Onboard';

    return {
      emoji: null,
      title: `${projectName} Loops`,
      description:
        'View and manage all your conversation loops. Start a new loop to collaborate with your AI team on specific tasks or continue an existing conversation.',
      description2: null,
      buttonText: `Start ${stageName} Loop`,
    };
  }, [selectedProject?.name, activeStage?.name]);

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

  return (
    <div className="min-h-screen h-screen w-full bg-neutral-grayscale-0 flex overflow-hidden">
      {/* Fixed Left Sidebar */}
      <LoopOpsSidebarLeft />

      {/* Main content area with responsive layout */}
      <div
        className="flex-1 flex min-w-0 overflow-hidden transition-all duration-300 ease-in-out"
        style={{ paddingLeft: `${leftSidebarWidth}px` }}
      >
        {/* Main Content Section */}
        <div
          className="@container bg-white flex flex-col flex-shrink-0 p-loop-6 min-w-0 space-y-loop-10"
          style={{ width: '60%' }}
        >
          <div className="">
            <div className="flex items-center gap-loop-2 text-2xl">
              <h1 className="font-bold text-neutral-grayscale-90">
                {workspacesLoading ? 'Loading...' : currentWorkspace?.name}
              </h1>
              <p className="text-neutral-grayscale-60">Loops History</p>
            </div>
          </div>

          {/* Loops Content Section - Takes remaining height */}
          <div className="flex items-center justify-between gap-loop-2">
            <div className="flex flex-col items-start justify-center gap-loop-2">
              {/* <h2 className="text-2xl font-bold">Loop History</h2> */}
              <p className="text-neutral-grayscale-60 text-lg">
                Your conversations with LoopOps' AI agents.
              </p>
            </div>
            <div className="flex items-center gap-loop-2">
              <ControlButton
                type="black_n_white"
                size="lg"
                onClick={() => setViewMode('internal')}
                text="Internal Loops"
                active={viewMode === 'internal'}
                className="h-loop-8"
              />
              <ControlButton
                type="black_n_white"
                size="lg"
                onClick={() => setViewMode('external')}
                text="External Loops"
                active={viewMode === 'external'}
                className="h-loop-8"
              />
              <SortFilter options={sortOptions} dropdownAlign="end" />
            </div>
          </div>
          <div className="flex-1 min-h-0 !mt-loop-10">
            {viewMode === 'internal' ? (
              <InternalLoopsDisplay stage={activeStage} sortBy={activeSortBy} />
            ) : (
              <ExternalLoopsDisplay stage={activeStage} sortBy={activeSortBy} />
            )}
          </div>
        </div>

        {/* Section 2: Welcome Section */}
        <ProjectContext2Section
          ref={fileViewerRef}
          data={loopsContextData}
          isLoading={createOrGetSession.isPending || isLoadingStageTemplate}
          buttonAction={handleStartSession}
        />
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

export default LoopsHistory;
