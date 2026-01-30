import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Agent } from '@/models/Agent';
import { useWorkspaceProjectStore } from '@/stores/workspaceProjectStore';
import { Edit, Trash2, UserPlus, Users } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';

interface WorkspaceAgents {
  workspace: {
    id: string;
    name: string;
  };
  agents: Agent[];
  teams: Agent[];
}

export const AgentDashboard: React.FC = () => {
  const availableWorkspaces = useWorkspaceProjectStore(
    (state) => state.workspaces,
  );
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [workspaceAgents, setWorkspaceAgents] = useState<WorkspaceAgents[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [agentToDelete, setAgentToDelete] = useState<Agent | null>(null);

  const loadAllAgents = useCallback(async () => {
    setLoading(true);
    try {
      const workspaceData: WorkspaceAgents[] = [];

      for (const workspace of availableWorkspaces) {
        try {
          // Query agents directly from the agents table
          const { data: allAgents, error } = await supabase
            .from('agents')
            .select('*')
            .or(`workspace_id.eq.${workspace.id},workspace_id.is.null`)
            .order('agent_name');

          if (error) {
            console.error(
              `Error loading agents for workspace ${workspace.name}:`,
              error,
            );
            continue;
          }

          const transformedAgents = (allAgents || []).map((agent: any) => ({
            id: agent.id,
            name: agent.agent_name,
            key: agent.key || `agent-${agent.id}`,
            color: agent.color || 'bg-blue-500',
            icon: 'User',
            expertise: agent.tools?.tools?.map((t: any) => t.name) || [],
            status: 'active',
            mode: agent.agent_mode === 'coordinator' ? 'team' : 'single',
            role: agent.agent_role,
            model: agent.model,
            prompt: agent.agent_prompt,
            members: agent.members,
            workspace_id: agent.workspace_id,
          }));

          const agents = transformedAgents.filter(
            (agent: Agent) => agent.mode !== 'team',
          );
          const teams = transformedAgents.filter(
            (agent: Agent) => agent.mode === 'team',
          );

          workspaceData.push({
            workspace: { id: workspace.id, name: workspace.name },
            agents,
            teams,
          });
        } catch (error) {
          console.error(
            `Error loading agents for workspace ${workspace.name}:`,
            error,
          );
          continue;
        }
      }

      setWorkspaceAgents(workspaceData);
    } catch (error) {
      console.error('Error loading agents:', error);
      toast({
        title: 'Error',
        description: 'Failed to load agents.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [availableWorkspaces, toast]);

  useEffect(() => {
    loadAllAgents();
  }, [loadAllAgents]);

  const handleDeleteAgent = (agent: Agent) => {
    setAgentToDelete(agent);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!agentToDelete) return;

    try {
      const { error } = await supabase
        .from('agents')
        .delete()
        .eq('id', agentToDelete.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `${
          agentToDelete.mode === 'team' ? 'Team' : 'Agent'
        } deleted successfully.`,
      });

      await loadAllAgents();
    } catch (error) {
      console.error('Error deleting agent:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete agent.',
        variant: 'destructive',
      });
    } finally {
      setDeleteDialogOpen(false);
      setAgentToDelete(null);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase())
      .join('')
      .slice(0, 2);
  };

  const getAgentName = (agentId: string, workspaceAgents: Agent[]) => {
    const agent = workspaceAgents.find((a) => a.id === agentId);
    return agent?.name || agentId;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Workspace sections */}
      {workspaceAgents.map(({ workspace, agents, teams }) => (
        <div key={workspace.id} className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-700">
            {workspace.name}
          </h2>

          {/* Individual Agents */}
          {agents.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-lg font-medium flex items-center space-x-2">
                <UserPlus className="w-5 h-5" />
                <span>Individual Agents ({agents.length})</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {agents.map((agent) => (
                  <Card
                    key={agent.id}
                    className="hover:shadow-md transition-shadow"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg flex items-center space-x-2">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback className="bg-blue-100 text-blue-700">
                              {getInitials(agent.name)}
                            </AvatarFallback>
                          </Avatar>
                          <span>{agent.name}</span>
                        </CardTitle>
                        <div className="flex space-x-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {}}
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteAgent(agent)}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {agent.role && (
                          <Badge variant="secondary">{agent.role}</Badge>
                        )}
                        {agent.model && (
                          <Badge variant="outline" className="text-xs">
                            {agent.model}
                          </Badge>
                        )}
                        {agent.prompt && (
                          <p className="text-sm text-slate-600 line-clamp-2">
                            {agent.prompt}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Teams */}
          {teams.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-lg font-medium flex items-center space-x-2">
                <Users className="w-5 h-5" />
                <span>Teams ({teams.length})</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {teams.map((team) => (
                  <Card
                    key={team.id}
                    className="hover:shadow-md transition-shadow border-l-4 border-l-purple-500"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg flex items-center space-x-2">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback className="bg-purple-100 text-purple-700">
                              {getInitials(team.name)}
                            </AvatarFallback>
                          </Avatar>
                          <span>{team.name}</span>
                        </CardTitle>
                        <div className="flex space-x-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {}}
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteAgent(team)}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          {team.role && (
                            <Badge variant="secondary">{team.role}</Badge>
                          )}
                          <Badge className="bg-purple-100 text-purple-700">
                            {team.members?.length || 0} members
                          </Badge>
                        </div>

                        {team.model && (
                          <Badge variant="outline" className="text-xs">
                            {team.model}
                          </Badge>
                        )}

                        {/* Team members */}
                        {team.members && team.members.length > 0 && (
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-slate-500">
                              Members:
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {team.members.slice(0, 3).map((memberId) => (
                                <Badge
                                  key={memberId}
                                  variant="outline"
                                  className="text-xs"
                                >
                                  {getAgentName(memberId, agents)}
                                </Badge>
                              ))}
                              {team.members.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{team.members.length - 3} more
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}

                        {team.prompt && (
                          <p className="text-sm text-slate-600 line-clamp-2">
                            {team.prompt}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {agents.length === 0 && teams.length === 0 && (
            <div className="text-center py-8 text-slate-500">
              <Users className="w-12 h-loop-10 mx-auto mb-4 opacity-50" />
              <p>No agents or teams in this workspace yet.</p>
            </div>
          )}
        </div>
      ))}

      {/* Empty state for no workspaces */}
      {workspaceAgents.length === 0 && (
        <div className="text-center py-12 text-slate-500">
          <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p>No workspaces available. Please create a workspace first.</p>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {agentToDelete?.mode === 'team' ? 'Team' : 'Agent'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{agentToDelete?.name}"? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
