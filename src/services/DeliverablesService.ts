import { supabase } from '@/integrations/supabase/client';
import { MilestoneItem } from '@/models/Deliverable';
import { ProjectItem } from '../components/projectContext/ProjectContextTypes';

interface GetDeliverablesRequest {
  workspace_id: string;
  project_id: string;
  stage_id: number;
  category_id: number;
}

interface GetDeliverablesResponse {
  category_id: number;
  items: ProjectItem[];
}

export class DeliverablesService {
  static async getStageDeliverables(
    projectId: string,
    stageId: number,
    workspaceId?: string,
  ): Promise<MilestoneItem[]> {
    const projectStageId = await this.getProjectStageId(projectId);

    if (!projectStageId) {
      console.warn(
        `No project_stage_id found for project ${projectId} and stage ${stageId}`,
      );
      return [];
    }

    if (workspaceId) {
      try {
        const categoryId = stageId * 10 + 1;
        const { data, error } =
          await supabase.functions.invoke<GetDeliverablesResponse>(
            'get-deliverables-v2',
            {
              body: {
                workspace_id: workspaceId,
                project_id: projectId,
                stage_id: stageId,
                category_id: categoryId,
              } as GetDeliverablesRequest,
            },
          );

        if (!error && data && data.items && data.items.length > 0) {
          return data.items.map((item) => ({
            id: item.id.toString(),
            name: item.title,
            requirements: item.description || null,
            keyDeliverable: item.keyDeliverable,
            updatedAt: new Date(item.updated_at).toISOString(),
          }));
        }
      } catch (error) {
        console.error('Edge function not ready, using direct query', error);
      }
    }

    return await this.getStageDeliverablesDirectQuery(projectStageId);
  }

  static async getAvailableDeliverablesForStage(
    projectId: string,
    stageId: number,
  ): Promise<MilestoneItem[]> {
    const projectStageId = await this.getProjectStageId(projectId);

    if (!projectStageId) {
      console.warn(
        `No project_stage_id found for project ${projectId} and stage ${stageId}`,
      );
      return [];
    }

    // Get the stage template id from the project stage
    const { data: projectStage, error: stageError } = await supabase
      .from('loopops_project_stages' as any)
      .select('template_id')
      .eq('id', projectStageId)
      .single();

    if (stageError || !projectStage) {
      console.error('Error fetching project stage template:', stageError);
      return [];
    }

    const templateId = (projectStage as any)?.template_id;
    if (!templateId) {
      console.warn('No template_id found for project stage:', projectStageId);
      return [];
    }

    // Get all available deliverable templates for this stage template
    const { data, error } = await supabase
      .from('loopops_global_deliverable_templates' as any)
      .select(
        `
        id,
        name,
        requirements_prompt
      `,
      )
      .eq('stage_template_id', templateId)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching available deliverables:', error);
      return [];
    }

    return (data || []).map((template: any) => ({
      id: template.id,
      name: template.name || 'Untitled Deliverable',
      requirements: template.requirements_prompt || null,
      keyDeliverable: false, // These are templates, not completed deliverables
      updatedAt: new Date().toISOString(),
    }));
  }

  private static async getProjectStageId(
    projectId: string,
  ): Promise<string | null> {
    const { data, error } = await supabase
      .from('loopops_project_stages' as any)
      .select('id')
      .eq('project_id', projectId)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error fetching project_stage_id:', error);
      return null;
    }

    return (data as any)?.id || null;
  }

  private static async getStageDeliverablesDirectQuery(
    projectStageId: string,
  ): Promise<MilestoneItem[]> {
    const { data, error } = await supabase
      .from('loopops_project_deliverables' as any)
      .select(
        `
        id,
        is_completed,
        updated_at,
        completion_metadata,
        loopops_global_deliverable_templates (
          name,
          requirements_prompt
        )
      `,
      )
      .eq('project_stage_id', projectStageId)
      .order('updated_at', { ascending: true });

    if (error) {
      console.error('Error fetching deliverables:', error);
      return [];
    }

    return (data || []).map((deliverable: any) => {
      const template = deliverable.loopops_global_deliverable_templates;

      return {
        id: deliverable.id,
        name: template?.name || 'Untitled Deliverable',
        requirements: template?.requirements_prompt || null,
        keyDeliverable: deliverable.keyDeliverable || false,
        updatedAt: deliverable.updated_at,
      };
    });
  }
}
