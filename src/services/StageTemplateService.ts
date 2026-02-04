import { StageTemplateRepository } from '@/repositories/StageTemplateRepository';
import { callBackendApi } from '@/utils/backendApiHelper';
import { buildTeamFromTemplate } from '@/utils/teamBuilders';

export interface CreateSessionOptions {
  sessionName: string;
  userId: string;
  workspaceId: string;
  projectId?: string;
  sessionType: 'agent' | 'team' | 'workflow';
  componentId?: string; // agent_id, team_id, or workflow_id
}

export interface CreateSessionResponse {
  session_id: string;
  created_at: string;
  updated_at?: string;
}

export class StageTemplateService {
  static async findTemplateForStage(stageId: string): Promise<string | null> {
    const templateId =
      await StageTemplateRepository.findTemplateIdForStage(stageId);
    console.log({ templateId });
    if (!templateId) {
      return null;
    }

    const isValid = await StageTemplateRepository.validateTemplate(templateId);

    if (!isValid) {
      return null;
    }

    return templateId;
  }

  static async createSession(
    options: CreateSessionOptions,
  ): Promise<CreateSessionResponse> {
    const {
      sessionName,
      userId,
      workspaceId,
      projectId,
      sessionType,
      componentId,
    } = options;

    const body: any = {
      session_name: sessionName,
      user_id: userId,
      metadata: {
        workspace_id: workspaceId,
        project_id: projectId,
        user_id: userId,
      },
    };

    if (componentId) {
      if (sessionType === 'agent') {
        body.agent_id = componentId;
      } else if (sessionType === 'team') {
        body.team_id = componentId;
      } else if (sessionType === 'workflow') {
        body.workflow_id = componentId;
      }
    }

    const response = await callBackendApi<CreateSessionResponse>(
      '/v1/sessions',
      'POST',
      body,
      {
        queryParams: { type: sessionType },
      },
    );

    return response;
  }

  static async createSessionForStage(
    stageName: string,
    templateType: 'agent' | 'team',
    workspaceId: string,
    userId: string,
    projectId?: string,
    templateId?: string,
  ): Promise<CreateSessionResponse> {
    return this.createSession({
      sessionName: `Stage: ${stageName}`,
      userId,
      workspaceId,
      projectId,
      sessionType: templateType,
      componentId: templateId,
    });
  }

  static async getTemplateDetails(templateId: string, workspaceId: string) {
    const template =
      await StageTemplateRepository.getTemplateDetails(templateId);
    if (!template) {
      return null;
    }
    return buildTeamFromTemplate(template, workspaceId);
  }
}
