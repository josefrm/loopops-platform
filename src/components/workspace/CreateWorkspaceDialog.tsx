import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Building } from 'lucide-react';
import { extractDomainFromEmail } from '@/utils/emailUtils';

interface CreateWorkspaceDialogProps {
  onWorkspaceCreated?: () => void;
  trigger?: React.ReactNode;
}

export const CreateWorkspaceDialog: React.FC<CreateWorkspaceDialogProps> = ({
  onWorkspaceCreated,
  trigger,
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    organization: '',
    description: '',
    domain: '',
    is_private: false,
  });

  useEffect(() => {
    if (open && user?.email) {
      const domain = extractDomainFromEmail(user.email);
      if (domain) {
        setFormData((prev) => ({ ...prev, domain }));
      }
    }
  }, [open, user?.email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      // Create workspace
      const { data: workspace, error: workspaceError } = await supabase
        .from('workspaces')
        .insert({
          name: formData.name,
          organization: formData.organization,
          description: formData.description,
          domain: formData.domain.trim() || null,
          is_private: formData.is_private,
        })
        .select()
        .single();

      if (workspaceError) throw workspaceError;

      // Add user as workspace member
      const { error: memberError } = await supabase
        .from('workspace_members')
        .insert({
          workspace_id: workspace.id,
          user_id: user.id,
          role: 'Admin',
          team: 'Leadership',
        });

      if (memberError) throw memberError;

      // Set as current workspace in onboarding_status
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

      setOpen(false);
      setFormData({
        name: '',
        organization: '',
        description: '',
        domain: '',
        is_private: false,
      });
      onWorkspaceCreated?.();
    } catch (error) {
      console.error('Error creating workspace:', error);
      toast({
        title: 'Error',
        description: 'Failed to create workspace. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button
            variant="outline"
            size="sm"
            className="flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>New Workspace</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Building className="w-5 h-5" />
            <span>Create New Workspace</span>
          </DialogTitle>
          <DialogDescription>
            Create a new workspace for your team to collaborate on ticket
            grooming.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Workspace Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="e.g., Product Team Workspace"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="organization">Organization</Label>
              <Input
                id="organization"
                value={formData.organization}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    organization: e.target.value,
                  }))
                }
                placeholder="e.g., Acme Inc."
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="domain">Domain (Optional)</Label>
              <Input
                id="domain"
                value={formData.domain}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, domain: e.target.value }))
                }
                placeholder="e.g., company.com"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Brief description of this workspace"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_private"
                checked={formData.is_private}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({
                    ...prev,
                    is_private: checked as boolean,
                  }))
                }
              />
              <Label htmlFor="is_private" className="text-sm">
                Make this workspace private
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Workspace'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
