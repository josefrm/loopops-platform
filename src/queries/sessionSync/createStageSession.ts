import { StageTemplateService } from '@/services/StageTemplateService';

interface CreateStageSessionOptions {
  userId: string;
  workspaceId: string;
  projectId?: string;
  stageTemplateId: string;
  stageType: 'agent' | 'team' | 'workflow';
}

export const createStageSession = async ({
  userId,
  workspaceId,
  projectId,
  stageTemplateId,
  stageType,
}: CreateStageSessionOptions): Promise<string> => {
  const sessionResponse = await StageTemplateService.createSession({
    sessionName: 'Loop',
    userId,
    workspaceId,
    projectId,
    sessionType: stageType,
    componentId: stageTemplateId,
  });

  return sessionResponse.session_id;
};
