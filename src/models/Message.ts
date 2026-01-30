export interface MessageAction {
  id: string;
  label: string;
  prompt?: string;
  perform_action?: boolean;
  type?: 'primary' | 'secondary' | 'outline';
  value?: string;
  actionType?: 'auto' | 'manual';
  disabled?: boolean;
}

export interface MessageAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url?: string;
  file?: File;
  file_id?: string;
  file_name?: string;
}

export interface Message {
  id: string;
  content: string;
  sender: 'user' | 'agent';
  agentType?: string;
  timestamp: Date;
  agent_id?: string;
  agent_name?: string;
  team_name?: string;
  team_members?: string[];
  active_member_ids?: string[];
  actions?: MessageAction[];
  attachments?: MessageAttachment[];
  metadata?: Record<string, any>;
  step_finished?: boolean;
}
