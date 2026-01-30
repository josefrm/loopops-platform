export enum WorkspaceMemberRole {
  Admin = 'Admin',
  Member = 'Member',
  Guest = 'Guest',
}

export interface Workspace {
  id: string;
  name: string;
  member_role: WorkspaceMemberRole;
}
