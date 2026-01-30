import { StageTemplateService } from '@/services/StageTemplateService';
import { AgnoSessionService } from '@/services/AgnoSessionService';
import { useMutation } from '@tanstack/react-query';

interface CreateOrGetSessionParams {
  userId: string;
  workspaceId: string;
  projectId?: string;
  projectStageId: string;
  stageId: number;
}

interface CreateOrGetSessionResult {
  sessionId: string;
}

export const useCreateOrGetSession = () => {
  return useMutation({
    mutationFn: async ({
      userId,
      workspaceId,
      projectId,
      projectStageId,
    }: CreateOrGetSessionParams): Promise<CreateOrGetSessionResult> => {
      // Save workspace ID to sessionStorage for future use
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('lastUsedWorkspaceId', workspaceId);
        if (projectId) {
          sessionStorage.setItem('lastUsedProjectId', projectId);
        }
      }
      // Get stage template info
      const stageTemplateId = await StageTemplateService.findTemplateForStage(
        projectStageId,
      );

      if (!stageTemplateId) {
        throw new Error('No template ID found for stage');
      }

      // Get template details to know the type
      const templateDetails = await StageTemplateService.getTemplateDetails(
        stageTemplateId,
        workspaceId,
      );

      if (!templateDetails) {
        throw new Error('No template details found');
      }

      const sessionType = templateDetails.team?.type || 'team';

      const response = await AgnoSessionService.getSessions({
        workspace_id: workspaceId,
        project_id: projectId || '',
        user_id: userId,
        component_id: stageTemplateId,
      });

      const existingSessions = AgnoSessionService.transformMultipleToLegacyFormat(response.data);

      let sessionId: string;

      if (existingSessions.length > 0) {
        sessionId = existingSessions[0].session_id;
      } else {
        const sessionResponse = await StageTemplateService.createSession({
          sessionName: 'Loop',
          userId,
          workspaceId,
          projectId,
          sessionType: sessionType as 'agent' | 'team' | 'workflow',
          componentId: stageTemplateId,
        });
        sessionId = sessionResponse.session_id;
      }

      return { sessionId };
    },
  });
};
