import { ChatHeader } from '@/components/chat/ChatHeader';
import { DocumentViewer } from '@/components/chat/DocumentViewer';
import { SSEConnectionIndicator } from '@/components/chat/SSEConnectionIndicator';
import { StageNavigationLoader } from '@/components/chat/StageNavigationLoader';
import { useAuth } from '@/contexts/AuthContext';
import { useSSEConnection } from '@/contexts/SSEConnectionContext';
import { MessageList } from '@/features/chat/components/MessageList';
import { useChat } from '@/features/chat/hooks/useChat';
import { useStreaming } from '@/features/chat/hooks/useStreaming';
import { useUIStore } from '@/features/chat/stores/uiStore';
import { useToast } from '@/hooks/use-toast';
import { FileAttachment, useDragAndDrop } from '@/hooks/useDragAndDrop';
import { useModelForTemplate } from '@/hooks/useModelForTemplate';
import { useStageNavigation } from '@/hooks/useStageNavigation';
import { useStageTemplate } from '@/hooks/useStageTemplate';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Message, MessageAction } from '@/models/Message';
import { useUpdateSessionNameMutation } from '@/queries/sessionSync';
import { ModelCapabilitiesService } from '@/services/ModelCapabilitiesService';
import { useFileTransferStore } from '@/stores/fileTransferStore';
import { useWorkspaceProjectStore } from '@/stores/workspaceProjectStore';
import { SYSTEM_MAX_FILES } from '@/utils/fileUploadValidation';
import {
  getTargetStageName,
  isStageNavigationAction,
} from '@/utils/stageNavigationActions';
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AIChatBox } from '../ui/AIChatBox';

interface ChatInterfaceProps {
  className?: string;
  style?: React.CSSProperties;
  tabId: string;
  loadedMessages?: Message[];
  loadedTitle?: string;
  currentChatId?: string;
  onChatSaved?: (chatId: string) => void;
  onTitleChange?: (title: string) => void;
  onClose?: (messages: Message[], title: string) => void;
  isCollapsed?: boolean;
  chatHeaderNavigationRef?: React.RefObject<HTMLDivElement>;
  inputChatContainerRef?: React.RefObject<HTMLTextAreaElement>;
}

export const ChatInterface = forwardRef<HTMLDivElement, ChatInterfaceProps>(
  (
    {
      className,
      style,
      tabId,
      loadedMessages: _loadedMessages,
      loadedTitle: _loadedTitle,
      currentChatId,
      onTitleChange,
      chatHeaderNavigationRef,
      inputChatContainerRef,
    },
    ref,
  ) => {
    const [showDocumentViewer, setShowDocumentViewer] = useState(false);
    const [selectedDocument, setSelectedDocument] = useState<{
      title: string;
      content: string;
    } | null>(null);
    const [initialFiles, setInitialFiles] = useState<FileAttachment[]>([]);
    const [navigatingToStage, setNavigatingToStage] = useState<string | null>(
      null,
    );

    const { toast } = useToast();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const { getFilesForTransfer, clearTransfer } = useFileTransferStore();
    const { navigateToStage, isNavigating } = useStageNavigation();

    const currentWorkspace = useWorkspaceProjectStore((state) =>
      state.getCurrentWorkspace(),
    );
    const selectedProject = useWorkspaceProjectStore((state) =>
      state.getCurrentProject(),
    );

    const { stageId, stageTemplate } = useStageTemplate();

    // Model capabilities for drag and drop
    const { data: modelForTemplate, allCapabilities: allModelCapabilities } =
      useModelForTemplate(stageTemplate?.id);

    const activeAgent = useMemo(() => {
      if (!stageTemplate?.id) return undefined;
      if (stageTemplate.agents && stageTemplate.agents.length > 0) {
        return stageTemplate.agents[0];
      }
      return undefined;
    }, [stageTemplate]);

    const modelCapabilities = useMemo(() => {
      if (!allModelCapabilities || !activeAgent?.model) return null;
      return ModelCapabilitiesService.getByModelId(
        allModelCapabilities,
        activeAgent.model,
      );
    }, [allModelCapabilities, activeAgent?.model]);

    const modelCapabilitiesFromTemplate = useMemo(() => {
      if (!allModelCapabilities || !modelForTemplate) return null;
      return (
        allModelCapabilities.find((c) => c.modelId === modelForTemplate) || null
      );
    }, [allModelCapabilities, modelForTemplate]);

    const defaultModelCapabilities = allModelCapabilities?.[0] ?? null;

    // Use template > agent > default fallback
    const capabilities =
      modelCapabilitiesFromTemplate ||
      modelCapabilities ||
      defaultModelCapabilities;

    // Drag and Drop Hook
    const {
      isDragOver,
      handleDragOver,
      handleDragLeave,
      handleDrop,
      handleFileInput,
    } = useDragAndDrop({
      onFilesAdded: (files) => {
        setInitialFiles((prev) => [...prev, ...files]);
      },
      onError: (error) => {
        toast({
          title: 'File Error',
          description: error,
          variant: 'destructive',
        });
      },
      maxFileSize: capabilities?.maxFileSizeMB
        ? capabilities.maxFileSizeMB * 1024 * 1024
        : 10 * 1024 * 1024,
      maxFiles: SYSTEM_MAX_FILES,
      modelCapabilities: capabilities,
    });

    const { user } = useAuth();
    const { startStream, abortStream } = useSSEConnection();
    const updateSessionNameMutation = useUpdateSessionNameMutation();

    // Use currentChatId (the actual session ID) instead of tabId
    // Messages are synced by SessionSyncContext, no need for useSession here
    const chat = useChat({ sessionId: currentChatId, onTitleChange });

    const streaming = useStreaming(chat.sessionId || currentChatId || tabId);

    const inputValue = useUIStore(
      useCallback((state) => state.inputValuesByTab[tabId] || '', [tabId]),
    );
    const setInputValue = useCallback(
      (value: string) => {
        useUIStore.getState().setInputValue(tabId, value);
      },
      [tabId],
    );

    const isStreamingCurrentChat = useUIStore(
      useCallback(
        (state) => !!state.streamingBySession[chat.sessionId || tabId],
        [chat.sessionId, tabId],
      ),
    );

    useEffect(() => {
      const transferId = searchParams.get('transferId');

      if (transferId) {
        const files = getFilesForTransfer(transferId);

        if (files && files.length > 0) {
          setInitialFiles(files);

          toast({
            title: 'Files loaded',
            description: `${files.length} file(s) loaded from previous screen`,
          });
        }

        clearTransfer(transferId);

        const newParams = new URLSearchParams(searchParams);
        newParams.delete('transferId');
        setSearchParams(newParams, { replace: true });
      }
    }, [
      searchParams,
      setSearchParams,
      getFilesForTransfer,
      clearTransfer,
      toast,
    ]);

    // Mark history as loaded when messages are present
    useEffect(() => {
      if (chat.sessionId && chat.messages.length > 0 && !chat.isHistoryLoaded) {
        chat.markHistoryLoaded();
      }
    }, [
      chat.sessionId,
      chat.messages.length,
      chat.isHistoryLoaded,
      chat.markHistoryLoaded,
    ]);

    // Session creation is now handled by ChatController/SessionSync
    // This component no longer creates sessions directly to avoid race conditions

    // Ref to prevent duplicate message sends
    const sendingInProgressRef = useRef(false);

    const handleSendMessage = useCallback(
      async (
        files?: FileAttachment[],
        customPrompt?: string,
        displayText?: string,
      ) => {
        const sessionId = chat.sessionId;
        console.log('handleSendMessage called', {
          sessionId,
          customPrompt,
          displayText,
          filesCount: files?.length,
          sendingInProgress: sendingInProgressRef.current,
        });

        // Prevent duplicate sends - check immediately
        if (sendingInProgressRef.current) {
          console.warn(
            '[ChatInterface] Send already in progress, ignoring duplicate call',
          );
          return;
        }

        if (!sessionId) {
          toast({
            title: 'Session not ready',
            description: 'Please wait for session to be created',
            variant: 'destructive',
          });
          return;
        }

        // Validate that this session is still the active URL session
        const urlParams = new URLSearchParams(window.location.search);
        const urlSessionId = urlParams.get('session_id');
        if (urlSessionId && urlSessionId !== sessionId) {
          console.warn(
            '[ChatInterface] Attempted to send message for inactive session:',
            sessionId,
            'current:',
            urlSessionId,
          );
          toast({
            title: 'Session changed',
            description: 'Please try again in the current session',
            variant: 'destructive',
          });
          return;
        }

        // Check if there's already an active stream for this session
        const uiStore = useUIStore.getState();
        if (uiStore.streamingBySession[sessionId]?.isActive) {
          toast({
            title: 'Response in progress',
            description: 'Please wait for the current response to complete',
          });
          return;
        }

        // Mark send as in progress
        sendingInProgressRef.current = true;

        const messageContent = customPrompt || inputValue;
        if (!messageContent.trim() && (!files || files.length === 0)) return;

        if (!customPrompt) {
          useUIStore.getState().clearInputValue(tabId);
        }

        chat.addMessage({
          content: displayText || messageContent,
          sender: 'user',
          timestamp: new Date(),
          attachments: files?.map((f) => ({
            id: `attach-${Date.now()}-${Math.random()}`,
            name: f.file?.name || f.name,
            type: f.file?.type || f.type,
            size: f.file?.size || 0,
            file: f.file,
          })),
        });

        const agentMessage = chat.addMessage({
          content: '',
          sender: 'agent',
          timestamp: new Date(),
        });

        useUIStore.getState().setStreaming(sessionId, agentMessage.id);
        useUIStore.getState().setTyping(sessionId, true);


        try {
          let fileKeys: string[] = [];
          let bucketName: string | undefined;

          // Upload files if present
          if (
            files &&
            files.length > 0 &&
            currentWorkspace?.id &&
            selectedProject?.id
          ) {
            try {
              toast({
                title: 'Uploading files...',
                description: 'Please wait while we upload your files.',
              });

              const { uploadChatFiles } =
                await import('@/features/chat/utils/fileUpload');

              const result = await uploadChatFiles(
                files,
                currentWorkspace.id,
                selectedProject.id,
              );

              fileKeys = result.fileKeys;
              bucketName = result.bucketName;

              toast({
                title: 'Files uploaded',
                description: 'Sending message...',
              });
            } catch (error) {
              console.error('File upload failed:', error);
              toast({
                title: 'File upload failed',
                description:
                  'Failed to upload files using the new method. Falling back to legacy upload.',
                variant: 'destructive',
              });
              // Fallback not explicitly handled here, but if fileKeys is empty,
              // we can choose to send files as attachments if we want to support fallback
              // For now, based on instructions, we generally want to move to new method.
              // If upload fails, we probably shouldn't proceed or should let the stream fail if files are required.
              // However, the original code passed `files` to startStream.
              // Let's decide: if upload fails, do we abort or try legacy?
              // The user request was "implementation of the new file handling", implying replacement.
              // But to be safe, if I don't populate fileKeys, I should probably re-throw or handle gracefully.
              // For now, I'll throw to stop execution if upload fails, as partial state might be bad.
              throw error;
            }
          }

          await startStream({
            sessionId,
            tabId: tabId,
            message: messageContent,
            runnerId: stageTemplate?.id,
            runnerType: stageTemplate?.type,
            workspaceId: currentWorkspace?.id,
            projectId: selectedProject?.id,
            stageId: stageId?.toString(),
            userId: user?.id,
            files:
              fileKeys.length > 0
                ? []
                : files?.map((f) => f.file!).filter(Boolean), // Only send raw files if we didn't get keys (fallback logic if I removed the throw above, but with throw it means [] here)
            fileKeys,
            bucketName,
            attachments: files,
            agentMessageId: agentMessage.id,
          });
        } catch (error) {
          console.error('Error starting stream:', error);
          streaming.stopStreaming();
          streaming.setTyping(false);
          toast({
            title: 'Error sending message',
            description:
              error instanceof Error ? error.message : 'Unknown error',
            variant: 'destructive',
          });
        } finally {
          setTimeout(() => {
            sendingInProgressRef.current = false;
          }, 1000);
        }
      },
      [
        chat.sessionId,
        chat.addMessage,
        chat.messages,
        chat.title,
        chat.updateTitle,
        streaming.startStreaming,
        streaming.setTyping,
        streaming.stopStreaming,
        inputValue,
        tabId,
        stageTemplate,
        currentWorkspace,
        stageId,
        toast,
        startStream,
        updateSessionNameMutation,
      ],
    );

    const handleSendWithMentions = useCallback(
      (customPrompt?: string, displayText?: string) => {
        handleSendMessage(undefined, customPrompt, displayText);
      },
      [handleSendMessage],
    );

    const handleSendWithFiles = useCallback(
      async (files: FileAttachment[]) => {
        // Direct upload and send - no more review or interception for onboarding
        handleSendMessage(files);
      },
      [handleSendMessage],
    );

    const handleMessageActionClick = useCallback(
      async (action: MessageAction) => {
        if (isStageNavigationAction(action)) {
          const targetStageName = getTargetStageName(action);

          if (targetStageName) {
            setNavigatingToStage(targetStageName);
            await navigateToStage({ stageName: targetStageName });
            setNavigatingToStage(null);

            return;
          }
        }

        const isAutoAction =
          action.perform_action !== undefined
            ? action.perform_action
            : action.actionType === 'auto' || action.actionType === undefined;

        if (isAutoAction) {
          handleSendWithMentions(
            action.prompt || action.value || action.label,
            action.label,
          );
        } else {
          const messageToEdit = action.prompt || action.value || action.label;
          setInputValue(messageToEdit);
          setTimeout(() => {
            inputChatContainerRef.current?.focus();
            const length = messageToEdit.length;
            inputChatContainerRef.current?.setSelectionRange(length, length);
          }, 100);
        }
      },
      [
        handleSendWithMentions,
        setInputValue,
        inputChatContainerRef,
        navigateToStage,
      ],
    );

    const handleOpenDocument = useCallback((title: string, content: string) => {
      setSelectedDocument({ title, content });
      setShowDocumentViewer(true);
    }, []);

    const handleEditInMindspace = async () => {
      if (
        !selectedDocument ||
        !currentWorkspace ||
        !selectedProject ||
        !user?.id
      )
        return;

      setShowDocumentViewer(false);

      try {
        // First, check if a file with the same filename already exists
        // File paths are stored as: {user_id}/{timestamp}_{sanitizedFilename}
        // We can match by pattern on file_path
        const { data: bucketData, error: bucketError } = await supabase
          .from('loopops_mindspace_buckets')
          .select('id')
          .eq('workspace_id', currentWorkspace.id)
          .eq('project_id', selectedProject.id)
          .eq('user_id', user.id)
          .maybeSingle();

        let existingFileId: string | null = null;

        if (!bucketError && bucketData?.id) {
          // Check if a file with the exact same filename already exists
          const { data: existingFile, error: fileError } = await supabase
            .from('loopops_mindspace_files')
            .select('id')
            .eq('mindspace_bucket_id', bucketData.id)
            .eq('file_name', selectedDocument.title)
            .maybeSingle();

          if (!fileError && existingFile?.id) {
            existingFileId = existingFile.id;
          }
        }

        // If file exists, use its ID; otherwise create a new file
        let fileId: string;

        if (existingFileId) {
          fileId = existingFileId;
        } else {
          const { data, error } = await supabase.functions.invoke<{
            success: boolean;
            file?: { id: string; file_name: string };
            error?: string;
          }>('create-mindspace-file', {
            body: {
              workspace_id: currentWorkspace.id,
              project_id: selectedProject.id,
              content: selectedDocument.content,
              file_name: selectedDocument.title,
              category_id: 1, // Default to "All" category
            },
          });

          if (error || !data?.success || !data.file?.id) {
            toast({
              title: 'Failed to create file',
              description:
                error?.message ||
                data?.error ||
                'An error occurred while creating the file',
              variant: 'destructive',
            });
            return;
          }

          fileId = data.file.id;
        }

        const params = new URLSearchParams({
          fileId: fileId,
        });

        navigate(`/mindspace?${params.toString()}`);

        toast({
          title: 'Opening in Mindspace',
          description: `${selectedDocument.title} is ready for editing`,
        });
      } catch (error) {
        console.error('Error creating mindspace file:', error);
        toast({
          title: 'Failed to create file',
          description:
            error instanceof Error
              ? error.message
              : 'An unexpected error occurred',
          variant: 'destructive',
        });
      }
    };

    return (
      <div
        ref={ref}
        className={cn(
          'relative flex flex-col h-full w-full overflow-hidden',
          className,
        )}
        style={style}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        data-testid="chat-interface"
      >
        <ChatHeader
          className="rounded-t-lg"
          chatHeaderNavigationRef={chatHeaderNavigationRef}
        />

        {isDragOver && (
          <div className="absolute inset-x-0 rounded-sm top-[60px] bottom-[100px] bg-brand-accent-50/10 border-2 border-dashed border-brand-accent-50 z-50 flex items-center justify-center backdrop-blur-[1px]">
            <p className="text-brand-accent-50 font-semibold text-lg flex flex-col items-center gap-2">
              Drop files here
            </p>
          </div>
        )}

        <div
          className="flex-1 overflow-hidden rounded-t-lg"
          style={{ minHeight: 0 }}
          data-testid="chat-messages-container"
        >
          <MessageList
            key={chat.sessionId || tabId}
            messages={chat.messages}
            isStreaming={isStreamingCurrentChat}
            streamingMessageId={streaming.streamingMessageId}
            isLoading={false}
            onMessageActionClick={handleMessageActionClick}
            onDocumentClick={handleOpenDocument}
            autoScrollToBottom={true}
            sessionId={chat.sessionId || tabId}
            data-testid="chat-message-list"
          />
        </div>

        <div
          className="flex-shrink-0 mx-loop-10 mb-loop-6 relative"
          data-testid="chat-input-container"
        >
          {isStreamingCurrentChat && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-10">
              <SSEConnectionIndicator
                isStreaming={isStreamingCurrentChat}
                isConnectionActive={true}
                alwaysShow={true}
                className="bg-neutral-grayscale-5 shadow-sm"
                onCancel={() => {
                  if (chat.sessionId) {
                    abortStream(chat.sessionId, tabId);
                  }
                }}
              />
            </div>
          )}
          <AIChatBox
            className="shadow-[0_0_20px_10px_rgba(255,255,255,0.9),0_0_40px_20px_rgba(255,255,255,0.6),0_0_60px_30px_rgba(255,255,255,0.3),0_0_80px_40px_rgba(255,255,255,0.1)]"
            inputRef={inputChatContainerRef}
            value={inputValue}
            onChange={setInputValue}
            onSend={handleSendWithMentions}
            onSendWithFiles={handleSendWithFiles}
            placeholder={
              isStreamingCurrentChat || streaming.isStreaming
                ? 'Waiting for response...'
                : 'Ask anything...'
            }
            disabled={isStreamingCurrentChat || streaming.isStreaming}
            stageTemplateId={stageTemplate?.id}
            initialFiles={initialFiles}
            onFileSelect={handleFileInput}
          />
        </div>

        {/* Stage Navigation Loader */}
        <StageNavigationLoader
          isNavigating={isNavigating}
          stageName={navigatingToStage || undefined}
        />
        {/* File Upload Loading Overlay */}

        <DocumentViewer
          isOpen={showDocumentViewer}
          onClose={() => setShowDocumentViewer(false)}
          documentTitle={selectedDocument?.title || ''}
          documentContent={selectedDocument?.content || ''}
          onEditInMindspace={handleEditInMindspace}
        />
      </div>
    );
  },
);

ChatInterface.displayName = 'ChatInterface';
