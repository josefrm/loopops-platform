import { ProjectSelector } from '@/components/workspace/ProjectSelector';
import { WorkspaceSelector } from '@/components/workspace/WorkspaceSelector';
import { Project, Workspace } from '@/stores/workspaceProjectStore';
import { forwardRef } from 'react';

type ContextHeaderProps = {
  currentWorkspace: Workspace | null;
  availableWorkspaces: Workspace[];
  workspacesLoading: boolean;
  onWorkspaceChange: (workspaceId: string) => Promise<void>;
  selectedProject: Project | null;
  availableProjects: Project[];
  isLoadingProjects: boolean;
  isProjectSelectorOpen: boolean;
  onProjectSelectorOpenChange: (open: boolean) => void;
  onProjectChange: (projectId: string) => Promise<void>;
  onCreateNewProject: () => void;
  highlightProjectId: string | null;
  canCreateProject?: boolean;
};

export const ContextHeader = forwardRef<HTMLDivElement, ContextHeaderProps>(
  (
    {
      currentWorkspace,
      availableWorkspaces,
      workspacesLoading,
      onWorkspaceChange,
      selectedProject,
      availableProjects,
      isLoadingProjects,
      isProjectSelectorOpen,
      onProjectSelectorOpenChange,
      onProjectChange,
      onCreateNewProject,
      highlightProjectId,
      canCreateProject = true,
    },
    ref,
  ) => {
    return (
      <div className="h-loop-10 flex items-center justify-between" ref={ref}>
        <div className="flex items-center gap-loop-2 flex-1">
          <div className="flex items-center gap-loop-2 flex-1">
            <div className="flex-1">
              {workspacesLoading ? (
                <div className="w-full h-loop-8 bg-neutral-grayscale-20 rounded-sm flex items-center justify-center">
                  <span className="text-sm text-neutral-grayscale-60">
                    Loading workspaces...
                  </span>
                </div>
              ) : currentWorkspace ? (
                <WorkspaceSelector
                  selectedWorkspace={currentWorkspace}
                  availableWorkspaces={availableWorkspaces}
                  onWorkspaceChange={onWorkspaceChange}
                />
              ) : (
                <div className="w-full h-loop-8 bg-neutral-grayscale-20 rounded-sm flex items-center justify-center">
                  <span className="text-sm text-neutral-grayscale-60">
                    No workspace selected
                  </span>
                </div>
              )}
            </div>
            <div className="flex-1">
              <ProjectSelector
                selectedProject={selectedProject}
                availableProjects={availableProjects}
                onProjectChange={onProjectChange}
                onCreateNewProject={onCreateNewProject}
                isLoading={isLoadingProjects}
                isOpen={isProjectSelectorOpen}
                onOpenChange={onProjectSelectorOpenChange}
                highlightProjectId={highlightProjectId}
                canCreateProject={canCreateProject}
              />
            </div>
          </div>
        </div>
      </div>
    );
  },
);

ContextHeader.displayName = 'ContextHeader';
