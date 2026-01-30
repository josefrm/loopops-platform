import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';

interface ChatMessage {
  role: string;
  content: string;
  created_at: string;
}

interface ChatHistory {
  id: string;
  title: string;
  messages: ChatMessage[];
  message_count: number;
  created_at: string;
  updated_at: string;
}

export const useChatHistory = () => {
  const [chatHistories, setChatHistories] = useState<ChatHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastLoadTime, setLastLoadTime] = useState<number>(0);
  const [isLoadingCache, setIsLoadingCache] = useState<boolean>(false);
  const [lastSessionsHash, setLastSessionsHash] = useState<string>('');
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      // Only load if we haven't loaded recently (within 30 seconds) or if we have no data
      const now = Date.now();
      const timeSinceLastLoad = now - lastLoadTime;
      const shouldLoad =
        chatHistories.length === 0 || timeSinceLastLoad > 30000;

      if (shouldLoad && !isLoadingCache) {
        loadChatHistories();
      } else {
        setIsLoading(false);
      }
    } else {
      setChatHistories([]);
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadChatHistories = async () => {
    if (!user || isLoadingCache) {
      return;
    }

    try {
      setIsLoading(true);
      setIsLoadingCache(true);

      // Get all sessions for the user
      const { data: sessions, error: sessionsError } = await supabase
        .from('sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (sessionsError) {
        console.error('Error fetching sessions:', sessionsError);
        throw sessionsError;
      }

      // Create a hash of the sessions to detect changes
      const sessionsHash = JSON.stringify(
        (sessions || []).map((s) => ({ id: s.id, created_at: s.created_at })),
      );

      // If sessions haven't changed and we have cached data, use it
      if (sessionsHash === lastSessionsHash && chatHistories.length > 0) {
        console.log('Sessions unchanged, using cached chat histories');
        setLastLoadTime(Date.now());
        return;
      }

      console.log('Sessions changed or no cache, loading fresh data');
      setLastSessionsHash(sessionsHash);

      // Get the first message and message count for each session
      const chatHistoriesPromises = (sessions || []).map(async (session) => {
        // Get the first message for preview
        const { data: firstMessage, error: firstMessageError } = await supabase
          .from('messages')
          .select('role, content, created_at')
          .eq('session_id', session.id)
          .order('created_at', { ascending: true })
          .limit(1);

        if (firstMessageError) {
          console.error(
            'Error fetching first message for session',
            session.id,
            ':',
            firstMessageError,
          );
        }

        // Get the total message count for this session
        const { count: messageCount, error: countError } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('session_id', session.id);

        if (countError) {
          console.error(
            'Error fetching message count for session',
            session.id,
            ':',
            countError,
          );
        }

        // Generate title from first message or use a default
        let title = 'Loop';
        if (firstMessage && firstMessage.length > 0) {
          const msg = firstMessage[0];
          title =
            msg.content.substring(0, 50) +
            (msg.content.length > 50 ? '...' : '');
        }

        // Ensure messages conform to ChatMessage interface
        const formattedMessages: ChatMessage[] = (firstMessage || []).map(
          (msg) => ({
            role: msg.role,
            content: msg.content,
            created_at: msg.created_at || new Date().toISOString(),
          }),
        );

        return {
          id: session.id,
          title,
          messages: formattedMessages,
          message_count: messageCount || 0,
          created_at: session.created_at || new Date().toISOString(),
          updated_at: session.created_at || new Date().toISOString(),
        };
      });

      const chatHistoriesData = (await Promise.all(chatHistoriesPromises))
        .filter(Boolean)
        .filter((chat) => chat.message_count > 1) as ChatHistory[]; // Only show chats with more than 1 message (excludes system messages)

      setChatHistories(chatHistoriesData);
      setLastLoadTime(Date.now());
    } catch (error) {
      console.error('Error loading chat histories:', error);
      toast({
        title: 'Error',
        description: 'Failed to load chat histories',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      setIsLoadingCache(false);
    }
  };

  const loadFullChatHistory = async (sessionId: string) => {
    if (!user) return null;

    try {
      // Get all messages for the session
      const { data: messages, error: messagesError } = await supabase
        .from('messages')
        .select('role, content, created_at')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (messagesError) {
        console.error(
          'Error fetching full messages for session',
          sessionId,
          ':',
          messagesError,
        );
        throw messagesError;
      }

      // Format messages to match ChatMessage interface
      const formattedMessages: ChatMessage[] = (messages || []).map((msg) => ({
        role: msg.role,
        content: msg.content,
        created_at: msg.created_at || new Date().toISOString(),
      }));

      return formattedMessages;
    } catch (error) {
      console.error('Error loading full chat history:', error);
      toast({
        title: 'Error',
        description: 'Failed to load chat history',
        variant: 'destructive',
      });
      return null;
    }
  };

  const saveChatHistory = async (title: string, messages: any[]) => {
    if (!user) return null;

    try {
      // Create a new session
      const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .insert({
          user_id: user.id,
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      // Store messages in messages table
      const messageInserts = messages.map((msg) => ({
        session_id: session.id,
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.content,
      }));

      const { error: messageError } = await supabase
        .from('messages')
        .insert(messageInserts);

      if (messageError) throw messageError;

      // Format messages to match ChatMessage interface
      const formattedMessages: ChatMessage[] = messageInserts.map((msg) => ({
        role: msg.role,
        content: msg.content,
        created_at: new Date().toISOString(),
      }));

      const newChatHistory: ChatHistory = {
        id: session.id,
        title,
        messages: [formattedMessages[0]], // Only store first message for preview
        message_count: messageInserts.length,
        created_at: session.created_at,
        updated_at: session.created_at,
      };

      setChatHistories((prev) => [newChatHistory, ...prev]);
      toast({
        title: 'Success',
        description: 'Chat saved successfully',
      });

      return newChatHistory;
    } catch (error) {
      console.error('Error saving chat history:', error);
      toast({
        title: 'Error',
        description: 'Failed to save chat',
        variant: 'destructive',
      });
      return null;
    }
  };

  const updateChatHistory = async (
    id: string,
    title: string,
    messages: any[],
  ) => {
    if (!user) return null;

    try {
      // Delete existing messages for this session
      const { error: deleteError } = await supabase
        .from('messages')
        .delete()
        .eq('session_id', id);

      if (deleteError) throw deleteError;

      // Insert updated messages
      const messageInserts = messages.map((msg) => ({
        session_id: id,
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.content,
      }));

      const { error: insertError } = await supabase
        .from('messages')
        .insert(messageInserts);

      if (insertError) throw insertError;

      // Format messages to match ChatMessage interface
      const formattedMessages: ChatMessage[] = messageInserts.map((msg) => ({
        role: msg.role,
        content: msg.content,
        created_at: new Date().toISOString(),
      }));

      const updatedHistory: ChatHistory = {
        id,
        title,
        messages: [formattedMessages[0]], // Only store first message for preview
        message_count: messageInserts.length,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setChatHistories((prev) =>
        prev.map((chat) => (chat.id === id ? updatedHistory : chat)),
      );

      return updatedHistory;
    } catch (error) {
      console.error('Error updating chat history:', error);
      toast({
        title: 'Error',
        description: 'Failed to update chat',
        variant: 'destructive',
      });
      return null;
    }
  };

  const deleteChatHistory = async (id: string) => {
    if (!user) return false;

    try {
      // Delete the session (this should cascade to delete messages)
      const { error } = await supabase
        .from('sessions')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setChatHistories((prev) => prev.filter((chat) => chat.id !== id));
      toast({
        title: 'Success',
        description: 'Chat deleted successfully',
      });

      return true;
    } catch (error) {
      console.error('Error deleting chat history:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete chat',
        variant: 'destructive',
      });
      return false;
    }
  };

  return {
    chatHistories,
    isLoading,
    saveChatHistory,
    updateChatHistory,
    deleteChatHistory,
    loadChatHistories,
    loadFullChatHistory,
  };
};
