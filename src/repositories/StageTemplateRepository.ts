import { supabase } from '@/integrations/supabase/client';

interface StageTemplateData {
  id: string;
  role_name: string;
  system_prompt: string;
  type: 'agent' | 'team';
  model?: string;
}

export class StageTemplateRepository {
  static async findTemplateIdForStage(stageId: string): Promise<string | null> {
    const { data: projectAgents, error: agentError } = await supabase
      .from('loopops_project_agents')
      .select('id, template_id')
      .eq('project_stage_id', stageId)
      .limit(1);

    if (agentError || !projectAgents || projectAgents.length === 0) {
      return null;
    }

    return projectAgents[0].template_id;
  }

  static async validateTemplate(templateId: string): Promise<boolean> {
    const { data: globalTemplate, error: templateError } = await supabase
      .from('loopops_global_agent_templates')
      .select('id')
      .eq('id', templateId)
      .maybeSingle();

    return !templateError && !!globalTemplate;
  }

  /**
   * Get template details from the database.
   * Note: Model lookup is NOT done here to avoid bypassing React Query cache.
   * Callers should use useModelForTemplate or pass model from cached capabilities.
   */
  static async getTemplateDetails(
    templateId: string,
    model?: string,
  ): Promise<StageTemplateData | null> {
    const { data: template, error: templateError } = await supabase
      .from('loopops_global_agent_templates')
      .select('id, role_name, system_prompt, type')
      .eq('id', templateId)
      .maybeSingle();

    if (templateError || !template) {
      return null;
    }

    return {
      ...template,
      type: template.type as 'agent' | 'team',
      model: model || undefined,
    };
  }
}
