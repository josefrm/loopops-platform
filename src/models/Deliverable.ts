export interface DeliverableTemplate {
  id: string;
  name: string;
  requirements_prompt: string | null;
  stage_template_id: string;
  created_at: string;
}

export interface ProjectDeliverable {
  id: string;
  project_stage_id: string;
  template_id: string;
  is_completed: boolean;
  completion_metadata: Record<string, any> | null;
  final_document_id: string | null;
  updated_at: string;
  template?: DeliverableTemplate;
}

export interface MilestoneItem {
  id: string;
  name: string;
  requirements: string | null;
  keyDeliverable: boolean;
  updatedAt: string;
}
