import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus } from 'lucide-react';
import React from 'react';

interface WorkspaceCreationProps {
  loading: boolean;
  createWorkspace: () => void;
  newWorkspaceName: string;
  setNewWorkspaceName: (name: string) => void;
  newWorkspaceOrg: string;
  setNewWorkspaceOrg: (org: string) => void;
  newWorkspaceDomain: string;
  setNewWorkspaceDomain: (domain: string) => void;
  newWorkspaceDesc: string;
  setNewWorkspaceDesc: (desc: string) => void;
  isPrivate: boolean;
  setIsPrivate: (isPrivate: boolean) => void;
}

export const WorkspaceCreation: React.FC<WorkspaceCreationProps> = ({
  loading,
  createWorkspace,
  newWorkspaceName,
  setNewWorkspaceName,
  newWorkspaceOrg,
  setNewWorkspaceOrg,
  newWorkspaceDomain,
  setNewWorkspaceDomain,
  newWorkspaceDesc,
  setNewWorkspaceDesc,
  isPrivate,
  setIsPrivate,
}) => {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="workspace-name">Workspace Name *</Label>
        <Input
          id="workspace-name"
          value={newWorkspaceName}
          onChange={(e) => setNewWorkspaceName(e.target.value)}
          placeholder="e.g., Product Team Workspace"
          className="mt-1"
        />
      </div>

      <div>
        <Label htmlFor="organization">Organization *</Label>
        <Input
          id="organization"
          value={newWorkspaceOrg}
          onChange={(e) => setNewWorkspaceOrg(e.target.value)}
          placeholder="e.g., Acme Corporation"
          className="mt-1"
        />
      </div>

      <div>
        <Label htmlFor="domain">Domain</Label>
        <Input
          id="domain"
          value={newWorkspaceDomain}
          onChange={(e) => setNewWorkspaceDomain(e.target.value)}
          placeholder="e.g., company.com"
          className="mt-1"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Optional: Domain for automatic workspace matching
        </p>
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={newWorkspaceDesc}
          onChange={(e) => setNewWorkspaceDesc(e.target.value)}
          placeholder="Brief description of this workspace..."
          className="mt-1"
        />
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="private-workspace"
          checked={isPrivate}
          onCheckedChange={(checked) => setIsPrivate(checked as boolean)}
        />
        <Label htmlFor="private-workspace" className="text-sm">
          Make this workspace private
        </Label>
      </div>

      <Button
        onClick={createWorkspace}
        disabled={
          loading || !newWorkspaceName.trim() || !newWorkspaceOrg.trim()
        }
        className="w-full"
      >
        <Plus className="w-4 h-4 mr-2" />
        Create Workspace
      </Button>
    </div>
  );
};
