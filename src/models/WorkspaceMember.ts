export interface WorkspaceMember {
  id: string;
  user_id: string;
  workspace_id: string;
  role: string;
  team: string;
  is_active: boolean;
  joined_at: string;
  profiles?: {
    id: string;
    full_name?: string;
    email?: string;
    avatar_url?: string;
  };
}

export interface LLMModel {
  id: string;
  name: string;
  provider: string;
  description: string;
}
