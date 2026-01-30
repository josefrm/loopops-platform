import { Agent } from './Agent';

export interface TeamMember {
  id: string;
  name: string;
  role?: string;
  color?: string;
  created_at?: string;
}
export interface Team {
  id: string;
  name: string;
  key: string;
  color?: string;
  role?: string;
  created_at?: string;
  model?: string;
  system_message?: string;
  type?: 'agent' | 'team';
  members?: TeamMember[];
  agents?: Agent[];
  allowDisable?: boolean;
}
