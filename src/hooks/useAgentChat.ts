import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { ChatService } from '@/services/ChatService';

export const useAgentChat = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const sendMessageToAgents = async (
    sessionId: string,
    prompt: string,
    context?: any[],
    teamId?: string,
    workspaceId?: string,
  ) => {
    setIsLoading(true);

    try {
      console.log('Sending prompt to agents with session ID:', sessionId);

      const data = await ChatService.sendMessageToAgents({
        session_id: sessionId,
        prompt: prompt,
        context: context || [],
        team_id: teamId,
        workspace_id: workspaceId,
      });

      console.log('Agent response received:', data);
      console.log('Response type:', typeof data);
      console.log('Response keys:', Object.keys(data || {}));
      console.log('Response.response field:', data?.response);
      return data; // Return the full response object instead of just data.response
    } catch (error: any) {
      console.error('Error sending message to agents:', error);
      toast({
        title: 'Agent Communication Error',
        description: error.message || 'Failed to communicate with AI agents',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    sendMessageToAgents,
    isLoading,
  };
};
