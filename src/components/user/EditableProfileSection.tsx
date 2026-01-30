import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Edit2, Save, X, Briefcase } from 'lucide-react';

interface EditableProfileSectionProps {
  profile: any;
  onProfileUpdate: () => void;
}

const roleOptions = [
  'Software Engineer',
  'Senior Software Engineer',
  'Lead Engineer',
  'Engineering Manager',
  'Product Manager',
  'Designer',
  'Data Scientist',
  'DevOps Engineer',
  'QA Engineer',
  'Business Analyst',
  'Project Manager',
  'Intern',
  'Other',
];

export const EditableProfileSection: React.FC<EditableProfileSectionProps> = ({
  profile,
  onProfileUpdate,
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [editingRole, setEditingRole] = useState(false);
  const [newRole, setNewRole] = useState(profile?.role || '');
  const [loading, setLoading] = useState(false);

  const updateWorkspaceMember = async (field: 'role', value: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('workspace_members')
        .update({ [field]: value })
        .eq('user_id', user?.id)
        .eq('workspace_id', profile?.current_workspace_id);

      if (error) throw error;

      // Also update the profiles table for consistency
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ [field]: value })
        .eq('id', user?.id);

      if (profileError) throw profileError;

      toast({
        title: 'Success',
        description: `${field.charAt(0).toUpperCase() + field.slice(1)} updated successfully.`,
      });

      onProfileUpdate();
    } catch (error) {
      console.error(`Error updating ${field}:`, error);
      toast({
        title: 'Error',
        description: `Failed to update ${field}.`,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRoleSave = async () => {
    await updateWorkspaceMember('role', newRole);
    setEditingRole(false);
  };

  const handleRoleCancel = () => {
    setNewRole(profile?.role || '');
    setEditingRole(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Briefcase className="w-5 h-5" />
          <span>Role & Position</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex justify-between items-center py-2 border-b border-slate-100">
            <span className="font-medium text-slate-700">Role</span>
            <div className="flex items-center space-x-2">
              {editingRole ? (
                <>
                  <Select
                    value={newRole}
                    onValueChange={setNewRole}
                    disabled={loading}
                  >
                    <SelectTrigger className="w-48 h-8">
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      {roleOptions.map((role) => (
                        <SelectItem key={role} value={role}>
                          {role}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    onClick={handleRoleSave}
                    disabled={loading}
                    className="h-8 px-2"
                  >
                    <Save className="w-3 h-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleRoleCancel}
                    disabled={loading}
                    className="h-8 px-2"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </>
              ) : (
                <>
                  <span className="text-slate-600">
                    {profile?.role || 'Not specified'}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditingRole(true)}
                    className="h-8 px-2"
                  >
                    <Edit2 className="w-3 h-3" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
