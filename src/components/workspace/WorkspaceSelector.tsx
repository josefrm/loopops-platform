import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import React from 'react';
import { Workspace } from '../../stores/workspaceProjectStore';

interface WorkspaceSelectorProps {
  selectedWorkspace: Workspace | null;
  availableWorkspaces: Workspace[];
  onWorkspaceChange: (workspace: string) => Promise<void>;
  keepOpen?: boolean; // For debugging purposes
}

export const WorkspaceSelector: React.FC<WorkspaceSelectorProps> = ({
  selectedWorkspace,
  availableWorkspaces,
  onWorkspaceChange,
  keepOpen = false,
}) => {
  return (
    <Select
      open={keepOpen ? true : undefined}
      value={selectedWorkspace?.id}
      onValueChange={(value) => {
        const workspace = availableWorkspaces.find((p) => p.id === value);
        if (workspace) onWorkspaceChange(workspace.id);
      }}
      onOpenChange={() => {
        // If keepOpen is true, prevent closing completely
        if (keepOpen) {
          return;
        }
      }}
    >
      <SelectTrigger className="w-full h-loop-8 rounded-sm bg-neutral-grayscale-0 text-neutral-grayscale-50 text-base border border-neutral-grayscale-50">
        <SelectValue>
          <div className="flex items-center space-x-2">
            <span className="truncate">
              {selectedWorkspace?.name || 'Select a workspace'}
            </span>
          </div>
        </SelectValue>
      </SelectTrigger>
      <SelectContent
        showDividers={false}
        chevronClassName="text-neutral-grayscale-50"
        className="max-h-[300px] w-[var(--radix-select-trigger-width)] min-w-0 p-loop-4 shadow-lg bg-neutral-grayscale-0 rounded-md border border-neutral-grayscale-20"
        onCloseAutoFocus={(e) => {
          if (keepOpen) {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
        onEscapeKeyDown={(e) => {
          if (keepOpen) {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
        onPointerDownOutside={(e) => {
          if (keepOpen) {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
      >
        {availableWorkspaces.map((workspace) => (
          <SelectItem
            key={workspace.id}
            value={workspace.id}
            className="p-loop-2 text-md cursor-pointer transition-colors duration-200 text-neutral-grayscale-50 rounded-xs focus:bg-neutral-grayscale-10 focus:text-neutral-grayscale-90 data-[state=checked]:bg-neutral-grayscale-10 data-[state=checked]:text-neutral-grayscale-90"
          >
            <div className="flex items-center space-x-loop-2 text-base">
              <span>{workspace.name}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
