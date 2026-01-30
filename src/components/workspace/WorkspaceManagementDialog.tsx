import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspaceProjectStore } from '@/stores/workspaceProjectStore';
import { extractDomainFromEmail } from '@/utils/emailUtils';
import { Building } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { WorkspaceCreation } from './WorkspaceCreation';
import { WorkspaceSelection } from './WorkspaceSelection';

interface Workspace {
  id: string;
  name: string;
  organization: string;
  description: string;
  is_private?: boolean;
  domain?: string;
}

interface WorkspaceManagementDialogProps {
  trigger: React.ReactNode;
  isOnboarding?: boolean; // New prop to indicate if this is during onboarding
  onWorkspaceChanged?: () => void; // Callback when workspace changes
}

export const WorkspaceManagementDialog: React.FC<
  WorkspaceManagementDialogProps
> = ({ trigger, isOnboarding = false, onWorkspaceChanged }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string | null>(
    null,
  );
  const [loading, setLoading] = useState(false);

  // New workspace form state
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [newWorkspaceOrg, setNewWorkspaceOrg] = useState('');
  const [newWorkspaceDesc, setNewWorkspaceDesc] = useState('');
  const [newWorkspaceDomain, setNewWorkspaceDomain] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const setCurrentWorkspaceIdInStore = useWorkspaceProjectStore(
    (state) => state.setCurrentWorkspaceId,
  );

  useEffect(() => {
    if (isOpen && user) {
      fetchWorkspaces();
      // Auto-populate domain from user's email
      if (user.email) {
        const domain = extractDomainFromEmail(user.email);
        if (domain) {
          setNewWorkspaceDomain(domain);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, user]);

  const fetchWorkspaces = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Get current workspace from onboarding_status only if not onboarding
      if (!isOnboarding) {
        const { data: onboardingData } = await supabase
          .from('onboarding_status')
          .select('workspace_id')
          .eq('user_id', user.id)
          .single();

        setCurrentWorkspaceId(onboardingData?.workspace_id || null);
      }

      // If onboarding, show all public workspaces + workspaces matching user's domain
      // If not onboarding, show workspaces where user is a member
      let workspaceQuery;

      if (isOnboarding) {
        // During onboarding, show public workspaces and domain-matched workspaces
        const userDomain = user.email
          ? extractDomainFromEmail(user.email)
          : null;

        workspaceQuery = supabase
          .from('workspaces')
          .select('*')
          .or(
            `is_private.eq.false${
              userDomain ? `,domain.eq.${userDomain}` : ''
            }`,
          );
      } else {
        // After onboarding, show workspaces where user is a member
        workspaceQuery = supabase
          .from('workspace_members')
          .select(
            `
            workspace_id,
            workspaces (
              id,
              name,
              organization,
              description,
              is_private,
              domain
            )
          `,
          )
          .eq('user_id', user.id)
          .eq('is_active', true);
      }

      const { data } = await workspaceQuery;

      if (data) {
        let workspaceList: Workspace[];

        if (isOnboarding) {
          workspaceList = data as Workspace[];
        } else {
          workspaceList = data

            .map((member: any) => member.workspaces)
            .filter(Boolean) as Workspace[];
        }

        setWorkspaces(workspaceList);
      }
    } catch (error) {
      console.error('Error fetching workspaces:', error);
      toast({
        title: 'Error',
        description: 'Failed to load workspaces.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const createWorkspace = async () => {
    if (!user || !newWorkspaceName.trim() || !newWorkspaceOrg.trim()) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      // Create the workspace
      const { data: workspace, error: workspaceError } = await supabase
        .from('workspaces')
        .insert({
          name: newWorkspaceName.trim(),
          organization: newWorkspaceOrg.trim(),
          description: newWorkspaceDesc.trim(),
          domain: newWorkspaceDomain.trim() || null,
          is_private: isPrivate,
        })
        .select()
        .single();

      if (workspaceError) throw workspaceError;

      // Add user as admin member
      const { error: memberError } = await supabase
        .from('workspace_members')
        .insert({
          workspace_id: workspace.id,
          user_id: user.id,
          role: 'Admin',
        });

      if (memberError) throw memberError;

      // Update onboarding_status with new workspace
      const { error: onboardingError } = await supabase
        .from('onboarding_status')
        .upsert(
          {
            user_id: user.id,
            workspace_id: workspace.id,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'user_id',
          },
        );

      if (onboardingError) throw onboardingError;

      toast({
        title: 'Success',
        description: 'Workspace created successfully!',
      });

      // Reset form
      setNewWorkspaceName('');
      setNewWorkspaceOrg('');
      setNewWorkspaceDesc('');
      setNewWorkspaceDomain('');
      setIsPrivate(false);

      // Refresh data
      await fetchWorkspaces();
      setCurrentWorkspaceId(workspace.id);
      setCurrentWorkspaceIdInStore(workspace.id);

      // Close the dialog
      setIsOpen(false);

      // Call the callback if provided
      console.log(
        'WorkspaceManagementDialog: Calling onWorkspaceChanged callback for workspace creation',
      );
      onWorkspaceChanged?.();
    } catch (error) {
      console.error('Error creating workspace:', error);
      toast({
        title: 'Error',
        description: 'Failed to create workspace.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const joinOrSwitchWorkspace = async (workspaceId: string) => {
    if (!user) return;

    setLoading(true);
    try {
      // If onboarding, join the workspace first
      if (isOnboarding) {
        const { error: memberError } = await supabase
          .from('workspace_members')
          .insert({
            workspace_id: workspaceId,
            user_id: user.id,
            role: 'Member',
          });

        if (memberError) throw memberError;
      }

      // Update onboarding_status with selected workspace
      const { error } = await supabase.from('onboarding_status').upsert(
        {
          user_id: user.id,
          workspace_id: workspaceId,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id',
        },
      );

      if (error) throw error;

      setCurrentWorkspaceId(workspaceId);
      setCurrentWorkspaceIdInStore(workspaceId);

      toast({
        title: 'Success',
        description: isOnboarding
          ? 'Workspace joined successfully!'
          : 'Workspace switched successfully!!!!',
      });

      // Call the callback if provided
      console.log(
        'WorkspaceManagementDialog: Calling onWorkspaceChanged callback',
      );
      onWorkspaceChanged?.();

      console.log('WorkspaceManagementDialog: Closing dialog');
      setIsOpen(false);
    } catch (error) {
      console.error(
        `Error ${isOnboarding ? 'joining' : 'switching'} workspace:`,
        error,
      );
      toast({
        title: 'Error',
        description: `Failed to ${isOnboarding ? 'join' : 'switch'} workspace.`,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const tabText = isOnboarding ? 'Join Workspace' : 'Switch Workspace';
  const descriptionText = isOnboarding
    ? 'Join an existing workspace to collaborate with your team:'
    : 'Select a workspace to switch to:';

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Building className="w-5 h-5" />
            <span>Workspace Management</span>
          </DialogTitle>
        </DialogHeader>

        <Tabs
          defaultValue={isOnboarding ? 'join' : 'switch'}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value={isOnboarding ? 'join' : 'switch'}>
              {tabText}
            </TabsTrigger>
            <TabsTrigger value="create">Create New</TabsTrigger>
          </TabsList>

          <TabsContent
            value={isOnboarding ? 'join' : 'switch'}
            className="space-y-4"
          >
            <WorkspaceSelection
              loading={loading}
              workspaces={workspaces}
              isOnboarding={isOnboarding}
              currentWorkspaceId={currentWorkspaceId}
              descriptionText={descriptionText}
              joinOrSwitchWorkspace={joinOrSwitchWorkspace}
            />
          </TabsContent>

          <TabsContent value="create" className="space-y-4">
            <WorkspaceCreation
              loading={loading}
              createWorkspace={createWorkspace}
              newWorkspaceName={newWorkspaceName}
              setNewWorkspaceName={setNewWorkspaceName}
              newWorkspaceOrg={newWorkspaceOrg}
              setNewWorkspaceOrg={setNewWorkspaceOrg}
              newWorkspaceDomain={newWorkspaceDomain}
              setNewWorkspaceDomain={setNewWorkspaceDomain}
              newWorkspaceDesc={newWorkspaceDesc}
              setNewWorkspaceDesc={setNewWorkspaceDesc}
              isPrivate={isPrivate}
              setIsPrivate={setIsPrivate}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
