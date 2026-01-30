import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { ChatService } from '@/services/ChatService';

export const useMessageProcessor = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const processMessage = async (
    sessionId: string,
    ticketId: string,
    role: string,
    content: string,
  ) => {
    if (!user) {
      toast({
        title: 'Authentication required',
        description: 'Please log in to send messages',
        variant: 'destructive',
      });
      return null;
    }

    setIsProcessing(true);

    try {
      console.log('Processing message:', { sessionId, ticketId, role });

      const data = await ChatService.processMessage({
        session_id: sessionId,
        ticket_id: ticketId,
        role,
        content,
        user_id: user.id,
      });

      console.log('Message processed successfully:', data);
      return data;
    } catch (error) {
      console.error('Error processing message:', error);
      toast({
        title: 'Error',
        description: 'Failed to process message',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    processMessage,
    isProcessing,
  };
};
