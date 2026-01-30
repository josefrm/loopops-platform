import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  useAvailableWorkspaces,
  useCurrentWorkspace,
  useSwitchWorkspace,
  useWorkspaceLoading,
} from '@/hooks/useCurrentWorkspace';
import { Building2, CheckCircle, Plus } from 'lucide-react';
import React from 'react';
import { WorkspaceManagementDialog } from './WorkspaceManagementDialog';

export const WorkspaceSwitcher: React.FC = () => {
  const currentWorkspace = useCurrentWorkspace();
  const availableWorkspaces = useAvailableWorkspaces();
  const loading = useWorkspaceLoading();
  const switchWorkspace = useSwitchWorkspace();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Building2 className="w-5 h-5" />
            <span>Workspaces</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-600">Loading workspaces...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Building2 className="w-5 h-5" />
            <span>Workspaces</span>
          </div>
          <WorkspaceManagementDialog
            trigger={
              <Button variant="outline" size="sm">
                <Plus className="w-4 h-4" />
              </Button>
            }
          />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {availableWorkspaces.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-slate-600 mb-3">No workspaces found</p>
            <WorkspaceManagementDialog
              trigger={<Button>Create Your First Workspace</Button>}
            />
          </div>
        ) : (
          availableWorkspaces.map((workspace) => (
            <div
              key={workspace.id}
              className={`p-3 border rounded-lg ${
                currentWorkspace?.id === workspace.id
                  ? 'border-purple-200 bg-purple-50'
                  : 'border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <h4 className="font-medium text-slate-800">
                      {workspace.name}
                    </h4>
                    {currentWorkspace?.id === workspace.id && (
                      <CheckCircle className="w-4 h-4 text-purple-500" />
                    )}
                  </div>
                  <p className="text-sm text-slate-600">
                    {workspace.organization}
                  </p>
                  {workspace.domain && (
                    <p className="text-xs text-slate-500">
                      Domain: {workspace.domain}
                    </p>
                  )}
                  {workspace.description && (
                    <p className="text-xs text-slate-500 mt-1">
                      {workspace.description}
                    </p>
                  )}
                  <div className="flex items-center space-x-2 mt-2">
                    {workspace.role && (
                      <Badge variant="outline">{workspace.role}</Badge>
                    )}
                    {workspace.is_private && (
                      <Badge variant="destructive">Private</Badge>
                    )}
                  </div>
                </div>
                {currentWorkspace?.id !== workspace.id && (
                  <Button
                    size="sm"
                    onClick={() => switchWorkspace(workspace.id)}
                    className="ml-2"
                  >
                    Switch
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};
