import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useWorkspaceProjectStore } from '@/stores/workspaceProjectStore';
import { Building } from 'lucide-react';
import React from 'react';

interface Workspace {
  id: string;
  name: string;
  organization: string;
  description: string;
  is_private?: boolean;
  domain?: string;
}

interface WorkspaceSelectionProps {
  loading: boolean;
  workspaces: Workspace[];
  isOnboarding: boolean;
  currentWorkspaceId?: string;
  descriptionText: string;
  joinOrSwitchWorkspace: (workspaceId: string) => void;
}

export const WorkspaceSelection: React.FC<WorkspaceSelectionProps> = ({
  loading,
  workspaces,
  isOnboarding,
  currentWorkspaceId,
  descriptionText,
  joinOrSwitchWorkspace,
}) => {
  const currentWorkspace = useWorkspaceProjectStore((state) =>
    state.getCurrentWorkspace(),
  );
  return (
    <div>
      <div className="text-sm text-muted-foreground mb-4">
        {descriptionText}
      </div>

      {loading ? (
        <div className="text-center py-8">Loading workspaces...</div>
      ) : workspaces.length === 0 ? (
        <div className="text-center py-8">
          <Building className="w-12 h-loop-10 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            {isOnboarding
              ? 'No available workspaces found'
              : 'No workspaces found'}
          </p>
          <p className="text-sm text-muted-foreground">
            {isOnboarding
              ? 'Create your first workspace to get started'
              : 'Create a workspace to get started'}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 max- h-96 overflow-y-auto">
          {workspaces.map((workspace) => (
            <Card
              key={workspace.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                currentWorkspace?.id === workspace.id ||
                currentWorkspaceId === workspace.id
                  ? 'ring-2 ring-primary'
                  : ''
              }`}
              onClick={() => joinOrSwitchWorkspace(workspace.id)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{workspace.name}</CardTitle>
                  <div className="flex items-center space-x-2">
                    {workspace.is_private && (
                      <Badge variant="secondary">Private</Badge>
                    )}
                    {!isOnboarding &&
                      (currentWorkspace?.id === workspace.id ||
                        currentWorkspaceId === workspace.id) && (
                        <Badge variant="default">Current</Badge>
                      )}
                  </div>
                </div>
                <CardDescription className="text-sm">
                  {workspace.organization}
                  {workspace.domain && (
                    <span className="text-xs text-muted-foreground block">
                      Domain: {workspace.domain}
                    </span>
                  )}
                </CardDescription>
              </CardHeader>
              {workspace.description && (
                <CardContent className="pt-0">
                  <p className="text-sm text-muted-foreground">
                    {workspace.description}
                  </p>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
