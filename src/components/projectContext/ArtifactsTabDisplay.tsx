import { useToast } from '@/hooks/use-toast';
import {
  ARTIFACTS_QUERY_KEY,
  useStageArtifacts,
} from '@/queries/projectContextQueries';
import { useDownloadProjectFiles } from '@/queries/projectFilesQueries';
import { ProjectStageService } from '@/services/ProjectStageService';
import { useDeliverablesStore } from '@/stores/deliverablesStore';
import { useWorkspaceProjectStore } from '@/stores/workspaceProjectStore';
import { useQueryClient } from '@tanstack/react-query';
import React, { useCallback, useEffect, useState } from 'react';
import { AILoadingState } from '../ui/AILoadingState';
import { ArtifactItemContent } from './ArtifactItemContent';
import { ProjectItem } from './ProjectContextTypes';
import { Stage } from './TabNavigationControl';

interface ArtifactsTabDisplayProps {
  stages: Stage[];
  onSelectedFilesChange?: (
    ids: string[],
    count: number,
    metadata: { id: string; title: string }[],
  ) => void;
}

interface ArtifactStageSectionProps {
  stage: Stage;
  workspaceId: string;
  projectId: string;
  selectedItemIds: Set<string>;
  onToggleItem: (id: string, title: string, checked: boolean) => void;
}

const ArtifactStageSection: React.FC<ArtifactStageSectionProps> = ({
  stage,
  workspaceId,
  projectId,
  selectedItemIds,
  onToggleItem,
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Use cached query
  const { data: items = [], isLoading } = useStageArtifacts(
    workspaceId,
    projectId,
    stage.project_stage_id,
  );

  const downloadProjectFilesMutation = useDownloadProjectFiles();

  const handleDownload = useCallback(
    async (fileId: string, fileName: string) => {
      try {
        toast({
          title: 'Download started',
          description: `Preparing ${fileName}...`,
        });

        const result = await downloadProjectFilesMutation.mutateAsync({
          file_ids: [fileId],
        });

        const downloadUrl = URL.createObjectURL(result.blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = result.fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(downloadUrl);

        toast({
          title: 'Download completed',
          description: `${fileName} downloaded successfully.`,
        });
      } catch (error) {
        console.error('Error downloading file:', error);
        toast({
          title: 'Download failed',
          description:
            error instanceof Error
              ? error.message
              : 'An error occurred while downloading the file.',
          variant: 'destructive',
        });
      }
    },
    [downloadProjectFilesMutation, toast],
  );

  const storeRevertDeliverable = useDeliverablesStore(
    (state) => state.revertDeliverable,
  );

  const handleRevert = useCallback(
    async (id: string, name: string) => {
      try {
        const { success } = await storeRevertDeliverable(id, name);
        if (success) {
          // Optimistic update: Remove from cache
          queryClient.setQueryData(
            [
              ARTIFACTS_QUERY_KEY,
              workspaceId,
              projectId,
              stage.project_stage_id,
            ],
            (oldData: ProjectItem[] | undefined) => {
              if (!oldData) return [];
              return oldData.filter((item) => item.id.toString() !== id);
            },
          );
        }
      } catch (error) {
        console.error('Error reverting deliverable:', error);
      }
    },
    [
      storeRevertDeliverable,
      queryClient,
      workspaceId,
      projectId,
      stage.project_stage_id,
    ],
  );

  const handleToggleKeyDeliverable = useCallback(
    async (id: string | number, currentStatus: boolean) => {
      try {
        const strId = id.toString();
        // Optimistic update
        queryClient.setQueryData(
          [ARTIFACTS_QUERY_KEY, workspaceId, projectId, stage.project_stage_id],
          (oldData: ProjectItem[] | undefined) => {
            if (!oldData) return [];
            return oldData.map((item) =>
              item.id.toString() === strId
                ? { ...item, isKeyDeliverable: !currentStatus }
                : item,
            );
          },
        );

        const result = await ProjectStageService.toggleKeyDeliverable(strId);

        if (!result.success) {
          // Revert on failure
          queryClient.setQueryData(
            [
              ARTIFACTS_QUERY_KEY,
              workspaceId,
              projectId,
              stage.project_stage_id,
            ],
            (oldData: ProjectItem[] | undefined) => {
              if (!oldData) return [];
              return oldData.map((item) =>
                item.id.toString() === strId
                  ? { ...item, isKeyDeliverable: currentStatus }
                  : item,
              );
            },
          );

          toast({
            title: 'Error',
            description: result.error || 'Failed to toggle status',
            variant: 'destructive',
          });
        } else {
          toast({
            title: !currentStatus
              ? 'Marked as Key Deliverable'
              : 'Removed from Key Deliverables',
            description: 'Status updated successfully',
          });
        }
      } catch (error) {
        console.error('Error toggling key deliverable:', error);
        // We could revert optimistic update here too if desired
      }
    },
    [toast, queryClient, workspaceId, projectId, stage.project_stage_id],
  );

  if (isLoading) {
    return (
      <div className="mb-loop-8">
        <h3 className="text-lg font-bold text-neutral-grayscale-90 mb-loop-4">
          {stage.name} Stage
        </h3>
        <AILoadingState message="Loading your artifacts..." />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mb-loop-8">
        <h3 className="text-lg font-bold text-neutral-grayscale-90 mb-loop-4">
          {stage.name} Stage
        </h3>
        <div className="p-loop-4 border border-dashed border-neutral-grayscale-30 rounded-md text-center">
          <p className="text-neutral-grayscale-50 text-sm">
            No artifacts in this stage.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-loop-8">
      <h3 className="text-lg font-bold text-neutral-grayscale-90 mb-loop-4">
        {stage.name} Stage
      </h3>
      <div className="flex flex-col gap-loop-4">
        {items.map((item) => (
          <ArtifactItemContent
            key={item.id}
            itemId={item.id}
            title={item.title}
            fileSize={item.fileSize}
            isDeliverable={item.isDeliverable}
            isKeyDeliverable={item.isKeyDeliverable}
            createdDate={item.created_at}
            updatedDate={item.updated_at}
            onToggleKeyDeliverable={handleToggleKeyDeliverable}
            onDownload={(id, name) => handleDownload(id, name)}
            onConvert={(id, name, isDeliverable) => {
              if (isDeliverable === false) {
                handleRevert(id, name);
              }
            }}
            isActive={selectedItemIds.has(item.id.toString())}
            onCheckedChange={(checked) =>
              onToggleItem(item.id.toString(), item.title, checked)
            }
            onClick={() => {
              // Always toggle selection, removed preview action
              const id = item.id.toString();
              const isSelected = selectedItemIds.has(id);
              onToggleItem(id, item.title, !isSelected);
            }}
          />
        ))}
      </div>
    </div>
  );
};

export const ArtifactsTabDisplay: React.FC<ArtifactsTabDisplayProps> = ({
  stages,
  onSelectedFilesChange,
}) => {
  const currentWorkspaceId = useWorkspaceProjectStore(
    (state) => state.currentWorkspaceId,
  );
  const currentProjectId = useWorkspaceProjectStore(
    (state) => state.currentProjectId,
  );

  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(
    new Set(),
  );
  const [selectedMetadata, setSelectedMetadata] = useState<
    Map<string, { id: string; title: string }>
  >(new Map());

  const handleToggleItem = useCallback(
    (id: string, title: string, checked: boolean) => {
      setSelectedItemIds((prev) => {
        const next = new Set(prev);
        if (checked) {
          next.add(id);
        } else {
          next.delete(id);
        }
        return next;
      });

      setSelectedMetadata((prev) => {
        const next = new Map(prev);
        if (checked) {
          next.set(id, { id, title });
        } else {
          next.delete(id);
        }
        return next;
      });
    },
    [],
  );

  useEffect(() => {
    onSelectedFilesChange?.(
      Array.from(selectedItemIds),
      selectedItemIds.size,
      Array.from(selectedMetadata.values()),
    );
  }, [selectedItemIds, selectedMetadata, onSelectedFilesChange]);

  if (!currentWorkspaceId || !currentProjectId) {
    return null;
  }

  return (
    <div className="pr-loop-2 pb-loop-8">
      {stages.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full p-loop-8">
          <p className="text-neutral-grayscale-60">No stages found.</p>
        </div>
      ) : (
        stages.map((stage) => (
          <ArtifactStageSection
            key={stage.project_stage_id || `stage-${stage.id}`}
            stage={stage}
            workspaceId={currentWorkspaceId}
            projectId={currentProjectId}
            selectedItemIds={selectedItemIds}
            onToggleItem={handleToggleItem}
          />
        ))
      )}
    </div>
  );
};
