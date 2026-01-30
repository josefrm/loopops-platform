import { useWorkspaceProjectStore } from '@/stores/workspaceProjectStore';
import { Building } from 'lucide-react';
import React from 'react';

export const CurrentWorkspaceDisplay: React.FC = () => {
  const currentWorkspace = useWorkspaceProjectStore((state) =>
    state.getCurrentWorkspace(),
  );
  return (
    <div className="p-2">
      <p className="text-xs text-muted-foreground mb-1">Current Workspace</p>
      <div className="flex items-center space-x-2">
        <Building className="w-3 h-3 text-muted-foreground" />
        <div>
          <p className="text-sm font-medium">{currentWorkspace?.name}</p>
          <p className="text-xs text-muted-foreground">
            {currentWorkspace?.organization}
          </p>
        </div>
      </div>
    </div>
  );
};
