import { CircleControlIcon } from '@/components/ui/CircleControlIcon';
import { Card } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useRunEventsStore } from '@/features/chat/stores/runEventsStore';
import { RunError } from '@/features/chat/stores/runErrorStore';
import { useToast } from '@/hooks/use-toast';
import { useSaveToMindspace } from '@/hooks/useSaveToMindspace';
import { Message, MessageAction } from '@/models/Message';
import { EventType } from '@/services/streaming/types';
import { useMindspaceStore } from '@/stores/mindspaceStore';
import { useWorkspaceProjectStore } from '@/stores/workspaceProjectStore';
import { MoreHorizontal } from 'lucide-react';
import { InlineRunError } from './InlineRunError';
import React, { useMemo } from 'react';
import { AttachmentsList } from './AttachmentsList';
import { MarkdownMessage } from './MarkdownMessage';
import { MessageActions } from './MessageActions';
import { RunEvent, RunStatusTimeline } from './RunStatusTimeline';
import { ToolCallsList } from './ToolCallsList';

interface DropdownAction {
  label: string;
  onClick: () => void;
}

interface MessageContentProps {
  message: Message;
  isStreaming: boolean;
  onMessageActionClick?: (action: MessageAction, messageId: string) => void;
  onDocumentClick?: (title: string, content: string) => void;
  dropdownActions?: DropdownAction[];
  /** Error to display before timestamp */
  error?: RunError | null;
  /** Callback when retry is clicked */
  onRetry?: () => void;
}

export const MessageContent: React.FC<MessageContentProps> = ({
  message,
  isStreaming,
  onMessageActionClick,
  onDocumentClick,
  dropdownActions,
  error,
  onRetry,
}) => {
  const isAgent = message.sender === 'agent';
  const isUser = message.sender === 'user';
  const { saveToMindspace } = useSaveToMindspace();
  const { toast } = useToast();

  // Mindspace store for refreshing documents after save
  const fetchDocuments = useMindspaceStore((state) => state.fetchDocuments);
  const currentWorkspaceId = useWorkspaceProjectStore(
    (state) => state.currentWorkspaceId,
  );
  const currentProjectId = useWorkspaceProjectStore(
    (state) => state.currentProjectId,
  );

  const EMPTY_EVENTS: RunEvent[] = [];
  const sessionKey = useMemo(() => message.id, [message.id]);
  const runEvents =
    useRunEventsStore((state) => state.eventsBySession[sessionKey]) ||
    EMPTY_EVENTS;
  const runStartTime = useRunEventsStore(
    (state) => state.startTimeBySession[sessionKey],
  );
  const isRunning =
    useRunEventsStore((state) => state.isRunningBySession[sessionKey]) || false;

  const isCompleted =
    !isStreaming &&
    runEvents.some(
      (e) =>
        e.type === EventType.TEAM_RUN_COMPLETED ||
        e.type === EventType.AGENT_RUN_COMPLETED ||
        e.type === EventType.RUN_COMPLETED,
    );

  const showTimeline = isAgent && (isStreaming || runEvents.length > 0);

  const handleSaveToMindspace = async () => {
    await saveToMindspace(message.content);

    // Refresh mindspace documents after save so sidebar updates
    if (currentWorkspaceId && currentProjectId) {
      await fetchDocuments(currentWorkspaceId, currentProjectId);
    }
  };

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      toast({
        title: 'Copied to clipboard',
        description: 'Message text has been copied',
      });
    } catch (error) {
      console.error('Failed to copy text to clipboard', error);
      toast({
        title: 'Failed to copy',
        description: 'Could not copy text to clipboard',
        variant: 'destructive',
      });
    }
  };

  const defaultDropdownActions: DropdownAction[] = [
    {
      label: 'Save to Mindspace',
      onClick: handleSaveToMindspace,
    },
    {
      label: 'Copy text',
      onClick: handleCopyText,
    },
  ];

  const actions = dropdownActions || defaultDropdownActions;

  return (
    <div
      className={`flex flex-col ${
        isUser ? 'items-end' : 'items-start'
      } gap-loop-2 max-w-full`}
      data-testid={`message-content-${message.id}`}
    >
      <Card
        variant={isUser ? 'message-user' : 'message-agent'}
        className="max-w-full"
        data-testid={`message-card-${message.id}`}
      >
        {isAgent ? (
          <div
            className="flex flex-col gap-loop-4"
            data-testid={`message-agent-content-${message.id}`}
          >
            {showTimeline && (
              <RunStatusTimeline
                events={runEvents}
                isRunning={isRunning || isStreaming}
                startTime={runStartTime}
                isTyping={isStreaming}
                isCompleted={isCompleted}
                data-testid={`message-timeline-${message.id}`}
              />
            )}
            {message.content && (
              <MarkdownMessage
                content={message.content}
                isUser={false}
                className="text-base leading-relaxed break-words"
                isStreaming={isStreaming}
                streamingSpeed={3}
                data-testid={`message-markdown-${message.id}`}
              />
            )}
            {message.actions && message.actions.length > 0 && (
              <MessageActions
                actions={message.actions}
                onActionClick={(action) => {
                  onMessageActionClick?.(action, message.id);
                }}
                className="justify-end"
                stepFinished={message.step_finished}
                data-testid={`message-actions-${message.id}`}
              />
            )}
          </div>
        ) : (
          <div
            className="text-base whitespace-pre-wrap leading-relaxed break-words text-left"
            data-testid={`message-user-content-${message.id}`}
          >
            {message.content}
          </div>
        )}
      </Card>

      {isAgent && (
        <div className="w-full border-t border-dashed border-neutral-grayscale-40" />
      )}

      {onDocumentClick &&
        message.attachments &&
        message.attachments.length > 0 && (
          <AttachmentsList
            attachments={message.attachments}
            onDocumentClick={onDocumentClick}
            data-testid={`message-attachments-${message.id}`}
          />
        )}

      {onDocumentClick && runEvents.length > 0 && (
        <ToolCallsList
          events={runEvents}
          onDocumentClick={onDocumentClick}
          data-testid={`message-tool-calls-${message.id}`}
        />
      )}

      {/* Show error before timestamp for user messages */}
      {error && isUser && (
        <div className="flex justify-end">
          <InlineRunError
            message={error.message}
            isRetrying={error.isRetrying}
            onRetry={error.isRetriable ? onRetry : undefined}
          />
        </div>
      )}

      <div
        className={`flex items-center gap-1 mt-1 ${
          isUser ? 'justify-end' : 'justify-start'
        }`}
        data-testid={`message-footer-${message.id}`}
      >
        <p
          className={`text-xs text-slate-500 ${
            isUser ? 'text-right' : 'text-left'
          }`}
          data-testid={`message-timestamp-${message.id}`}
        >
          {message.timestamp instanceof Date
            ? message.timestamp.toLocaleTimeString()
            : new Date(message.timestamp).toLocaleTimeString()}
        </p>
        {isAgent && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <CircleControlIcon
                type="transparent"
                size="xs"
                icon={<MoreHorizontal />}
                className="text-slate-500 hover:text-slate-800 p-0 h-4 w-4"
                data-testid={`message-more-actions-${message.id}`}
              />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align={isUser ? 'end' : 'start'}
              className="bg-brand-file-50 border-none text-white rounded-md p-loop-4 min-w-[220px] shadow-xl"
              data-testid={`message-dropdown-${message.id}`}
            >
              {actions.map((action, index) => (
                <React.Fragment key={index}>
                  <DropdownMenuItem
                    onClick={action.onClick}
                    className="cursor-pointer text-white focus:bg-white/10 focus:text-white px-loop-2 py-loop-1 text-md font-medium transition-colors"
                  >
                    {action.label}
                  </DropdownMenuItem>
                  {index < actions.length - 1 && (
                    <DropdownMenuSeparator className="bg-white/20 mx-loop-4 my-1 opacity-50" />
                  )}
                </React.Fragment>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
};
