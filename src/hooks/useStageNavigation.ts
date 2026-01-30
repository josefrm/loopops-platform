import { useAuth } from '@/contexts/AuthContext';
import { useMessageStore } from '@/features/chat/stores/messageStore';
import { useToast } from '@/hooks/use-toast';
import { useCurrentStage } from '@/hooks/useCurrentStage';
import { StageTemplateService } from '@/services/StageTemplateService';
import { useWorkspaceProjectStore } from '@/stores/workspaceProjectStore';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

interface NavigateToStageOptions {
  stageName: string;
}

export const useStageNavigation = () => {
  const [isNavigating, setIsNavigating] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const currentWorkspace = useWorkspaceProjectStore((state) =>
    state.getCurrentWorkspace(),
  );
  const selectedProject = useWorkspaceProjectStore((state) =>
    state.getCurrentProject(),
  );
  const { stages } = useCurrentStage();

  const navigateToStage = async ({
    stageName,
  }: NavigateToStageOptions): Promise<boolean> => {
    if (!user?.id) {
      toast({
        title: 'Authentication Error',
        description: 'You must be logged in to navigate between stages.',
        variant: 'destructive',
      });
      return false;
    }

    if (!currentWorkspace?.id) {
      toast({
        title: 'Workspace Error',
        description: 'No active workspace found.',
        variant: 'destructive',
      });
      return false;
    }

    setIsNavigating(true);

    try {
      // Clean up messages from previous stage
      const messageStore = useMessageStore.getState();
      messageStore.clearAllMessages();

      const searchName = stageName.toLowerCase().trim();

      let targetStage = stages.find(
        (stage) => stage.name.toLowerCase() === searchName,
      );

      if (!targetStage) {
        targetStage = stages.find((stage) => {
          const stageLower = stage.name.toLowerCase();
          const searchWords = searchName.split(/[\s&]+/);

          return searchWords.some(
            (word) =>
              word.length >= 4 &&
              stageLower.startsWith(
                word.substring(0, Math.min(word.length, stageLower.length)),
              ),
          );
        });
      }

      if (!targetStage) {
        targetStage = stages.find((stage) => {
          const stageLower = stage.name.toLowerCase();
          return (
            searchName.includes(stageLower) || stageLower.includes(searchName)
          );
        });
      }

      if (!targetStage) {
        toast({
          title: 'Stage Not Found',
          description: `Could not find stage "${stageName}". Available stages: ${stages
            .map((s) => s.name)
            .join(', ')}`,
          variant: 'destructive',
        });
        return false;
      }

      if (!targetStage.project_stage_id) {
        toast({
          title: 'Stage Error',
          description: 'Stage configuration is incomplete.',
          variant: 'destructive',
        });
        return false;
      }

      const stageTemplateId = await StageTemplateService.findTemplateForStage(
        targetStage.project_stage_id,
      );

      if (!stageTemplateId) {
        toast({
          title: 'Template Error',
          description: `No template found for stage "${stageName}".`,
          variant: 'destructive',
        });
        return false;
      }

      // Get template details to determine the session type
      const templateDetails = await StageTemplateService.getTemplateDetails(
        stageTemplateId,
        currentWorkspace.id,
      );

      if (!templateDetails) {
        toast({
          title: 'Template Error',
          description: 'Could not load stage template details.',
          variant: 'destructive',
        });
        return false;
      }

      const sessionType = templateDetails.team?.type || 'team';

      // Create a new session for the stage
      const sessionResponse = await StageTemplateService.createSession({
        sessionName: `${stageName} - Loop`,
        userId: user.id,
        workspaceId: currentWorkspace.id,
        projectId: selectedProject?.id,
        sessionType: sessionType as 'agent' | 'team' | 'workflow',
        componentId: stageTemplateId,
      });

      const sessionId = sessionResponse.session_id;

      if (!sessionId) {
        toast({
          title: 'Session Error',
          description: 'Could not create a session for the target stage.',
          variant: 'destructive',
        });
        return false;
      }

      // Invalidate the sessions query for the target stage so it fetches the new session
      // The query key pattern is ['agno-sessions', workspaceId, projectId, userId, componentId]
      await queryClient.invalidateQueries({
        queryKey: [
          'agno-sessions',
          currentWorkspace.id,
          selectedProject?.id,
          user.id,
          stageTemplateId,
        ],
      });

      const newParams = new URLSearchParams(searchParams);
      newParams.set('stage', targetStage.priority.toString());
      newParams.set('session_id', sessionId);

      navigate(`?${newParams.toString()}`, { replace: false });

      toast({
        title: 'Navigated Successfully',
        description: `Moved to ${stageName} stage.`,
      });

      return true;
    } catch (error: any) {
      console.error('Error navigating to stage:', error);
      toast({
        title: 'Navigation Error',
        description: error.message || 'Failed to navigate to the target stage.',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsNavigating(false);
    }
  };

  return {
    navigateToStage,
    isNavigating,
  };
};
