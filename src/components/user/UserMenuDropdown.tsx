import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useWorkspaceProjectStore } from '@/stores/workspaceProjectStore';
import { User } from '@supabase/supabase-js';
import { LogOut, Plus, RefreshCw, User as UserIcon } from 'lucide-react';
import React from 'react';
import { CurrentWorkspaceDisplay } from '../workspace/CurrentWorkspaceDisplay';
import { WorkspaceManagementDialog } from '../workspace/WorkspaceManagementDialog';

interface UserMenuDropdownProps {
  user: User;
  onProfileClick: () => void;
  onStartOnboarding: () => void;
  onSignOut: () => void;
}

export const UserMenuDropdown: React.FC<UserMenuDropdownProps> = ({
  user,
  onProfileClick,
  onStartOnboarding,
  onSignOut,
}) => {
  const currentWorkspace = useWorkspaceProjectStore((state) =>
    state.getCurrentWorkspace(),
  );
  return (
    <DropdownMenuContent className="w-80" align="end" forceMount>
      <div className="flex flex-col space-y-1 p-2">
        <p className="text-sm font-medium leading-none">
          {user.user_metadata?.full_name || 'User'}
        </p>
        <p className="text-xs leading-none text-muted-foreground">
          {user.email}
        </p>
      </div>

      {currentWorkspace && (
        <>
          <DropdownMenuSeparator />
          <CurrentWorkspaceDisplay />
        </>
      )}

      <DropdownMenuSeparator />
      <WorkspaceManagementDialog
        trigger={
          <DropdownMenuItem
            className="cursor-pointer"
            onSelect={(e) => e.preventDefault()}
          >
            <Plus className="mr-2 h-4 w-4" />
            <span>Add or Change Workspace</span>
          </DropdownMenuItem>
        }
      />

      <DropdownMenuSeparator />
      <DropdownMenuItem className="cursor-pointer" onClick={onProfileClick}>
        <UserIcon className="mr-2 h-4 w-4" />
        <span>Profile</span>
      </DropdownMenuItem>
      <DropdownMenuItem className="cursor-pointer" onClick={onStartOnboarding}>
        <RefreshCw className="mr-2 h-4 w-4" />
        <span>Start Onboarding</span>
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        className="cursor-pointer text-red-600"
        onClick={onSignOut}
      >
        <LogOut className="mr-2 h-4 w-4" />
        <span>Log out</span>
      </DropdownMenuItem>
    </DropdownMenuContent>
  );
};
