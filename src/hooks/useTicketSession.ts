import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { ChatService } from '@/services/ChatService';
import { Message } from '@/models/Message';

interface SessionData {
  session_id: string;
  messages: Message[];
  is_new_session?: boolean;
}

export const useTicketSession = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const getOrCreateSession = async (
    ticketId: string,
    selectedTicket?: any,
  ): Promise<SessionData | null> => {
    if (!user) {
      toast({
        title: 'Authentication required',
        description: 'Please log in to start a chat session',
        variant: 'destructive',
      });
      return null;
    }

    setIsLoading(true);

    try {
      console.log('Creating/retrieving session for ticket:', ticketId);

      const data = await ChatService.getOrCreateTicketSession({
        ticket_id: ticketId,
        user_id: user.id,
        selected_ticket: selectedTicket,
      });

      setCurrentSessionId(data.session_id);
      console.log(
        'Session ready:',
        data.session_id,
        'with',
        data.messages.length,
        'messages',
      );

      return data;
    } catch (error: any) {
      console.error('Error creating session:', error);
      toast({
        title: 'Session Error',
        description: error.message || 'Failed to create or retrieve session',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    getOrCreateSession,
    isLoading,
    currentSessionId,
  };
};
