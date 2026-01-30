import { AttachedFilesList } from '@/components/ui/AttachedFilesList';
import { AttachmentMenu } from '@/components/ui/AttachmentMenu';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { agentGradient } from '@/components/ui/loopops-branding/BrandGradient';
import { LoopOpsLogo } from '@/components/ui/loopops-branding/LoopOpsLogo';
import { useToast } from '@/hooks/use-toast';
import { FileAttachment } from '@/hooks/useDragAndDrop';
import { useModelForTemplate } from '@/hooks/useModelForTemplate';
import { useStageTemplate } from '@/hooks/useStageTemplate';
import { cn } from '@/lib/utils';
import { Agent } from '@/models/Agent';
import { ModelCapabilitiesService } from '@/services/ModelCapabilitiesService';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import './AIChatBox.css';
import { MicrophoneIcon } from './icons/MicrophoneIcon';

interface MentionItem {
  id: string;
  name: string;
  key: string;
  color: string;
  type: 'team' | 'agent';
}

interface TextSegment {
  id: string;
  type: 'text' | 'mention';
  content: string;
  mention?: MentionItem;
}

interface ActionChip {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'outline' | 'secondary';
  disabled?: boolean;
}

interface AIChatBoxProps {
  value: string;
  placeholder?: string;
  disabled?: boolean;
  agentSelected?: boolean;
  stageTemplateId?: string;
  agents?: Agent[];
  actionChips?: ActionChip[];
  showSendButton?: boolean;
  sendButtonIcon?: React.ReactNode;
  initialFiles?: FileAttachment[];
  onChange: (value: string) => void;
  onSend?: () => void;
  onSendWithFiles?: (files: FileAttachment[]) => void;
  onKeyPress?: (e: React.KeyboardEvent) => void;
  onMentionSelect?: (mentions: MentionItem[]) => void;
  onFileSelect?: (files: FileList | null) => void;
  className?: string;
  inputClassName?: string;
  actionsClassName?: string;
  inputRef?: React.RefObject<HTMLTextAreaElement>;
}

export const AIChatBox: React.FC<AIChatBoxProps> = ({
  value,
  placeholder = 'Ask anything...',
  disabled = false,
  agentSelected = true,
  stageTemplateId,
  actionChips = [],
  showSendButton = true,
  sendButtonIcon,
  initialFiles = [],
  onChange,
  onSend,
  onSendWithFiles,
  onKeyPress,
  onFileSelect,
  className,
  inputClassName,
  actionsClassName,
  inputRef: externalInputRef,
}) => {
  // Derive activeAgent from stageTemplate
  const { stageTemplate } = useStageTemplate(stageTemplateId);
  const activeAgent: Agent | undefined = useMemo(() => {
    if (!stageTemplate?.id) return undefined;
    if (stageTemplate.agents && stageTemplate.agents.length > 0) {
      return stageTemplate.agents[0];
    }
    return undefined;
  }, [stageTemplate]);
  const [showMentions, setShowMentions] = useState(false);
  const [selectedMentions, setSelectedMentions] = useState<MentionItem[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [textSegments, setTextSegments] = useState<TextSegment[]>([
    { id: 'initial', type: 'text', content: '' },
  ]);
  const [isTextareaExpanded, setIsTextareaExpanded] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<FileAttachment[]>([]);
  // Removed unused showFileUpload state
  const internalInputRef = useRef<HTMLTextAreaElement>(null);
  const inputRef = externalInputRef || internalInputRef;
  const trailingActionsRef = useRef<HTMLDivElement>(null);
  const leadingActionsRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const measureTextRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Fetch Capabilities
  const {
    data: modelForTemplate,
    isLoading: isLoadingTemplateModel,
    allCapabilities: allModelCapabilities,
  } = useModelForTemplate(stageTemplateId);

  const isLoadingCapabilities = isLoadingTemplateModel;

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

  // Internal file handler fallback if onFileSelect is not provided (though it should be)
  // We'll just define a dummy or use the prop directly
  // Note: We removed useDragAndDrop

  // ... (rest of parsing logic)

  // Convert text segments back to plain text for parent component
  const getPlainText = (segments: TextSegment[]): string => {
    return segments
      .map((segment) => {
        if (segment.type === 'mention' && segment.mention) {
          return `@${segment.mention.key || segment.mention.name}`;
        }
        return segment.content;
      })
      .join('');
  };

  // ... (parseTextToSegments logic)

  // Parse text with mentions into segments
  const parseTextToSegments = (
    text: string,
    mentions: MentionItem[] = selectedMentions,
  ): TextSegment[] => {
    const segments: TextSegment[] = [];
    const mentionRegex = /@(\w+)/g;
    let lastIndex = 0;
    let match;
    let segmentId = Date.now();

    while ((match = mentionRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        const textContent = text.slice(lastIndex, match.index);
        if (textContent) {
          segments.push({
            id: `text-${segmentId++}-${match.index}`,
            type: 'text',
            content: textContent,
          });
        }
      }

      const mentionKey = match[1];
      const foundMention = mentions.find(
        (m) => m.key === mentionKey || m.name === mentionKey,
      );

      if (foundMention) {
        segments.push({
          id: `mention-${foundMention.id}-${match.index}`,
          type: 'mention',
          content: `@${mentionKey}`,
          mention: foundMention,
        });
      } else {
        segments.push({
          id: `text-unknown-${segmentId++}-${match.index}`,
          type: 'text',
          content: match[0],
        });
      }

      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      segments.push({
        id: `text-end-${segmentId++}-${lastIndex}`,
        type: 'text',
        content: text.slice(lastIndex),
      });
    }

    return segments.length > 0
      ? segments
      : [{ id: 'empty', type: 'text', content: '' }];
  };

  // Handle value changes from parent
  useEffect(() => {
    const currentPlainText = getPlainText(textSegments);

    if (!value) {
      if (currentPlainText !== '') {
        setTextSegments([{ id: 'initial', type: 'text', content: '' }]);
        setSelectedMentions([]);
      }
    } else if (currentPlainText !== value) {
      const newSegments = parseTextToSegments(value);
      setTextSegments(newSegments);

      if (!value.trim()) {
        setSelectedMentions([]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // ... (resizing logic)

  // Calculate if textarea should be expanded based on available space
  const shouldExpandTextarea = (text: string): boolean => {
    if (!text || text.includes('\n')) {
      // Always expand if there are line breaks
      return text.includes('\n');
    }

    // Get container and trailing actions widths
    const containerWidth = containerRef.current?.offsetWidth || 0;
    const trailingActionsWidth = trailingActionsRef.current?.offsetWidth || 0;
    const leadingActionsWidth = leadingActionsRef.current?.offsetWidth || 0;

    // Calculate available space for inline text
    // Subtract padding, leading actions, trailing actions, and some buffer space
    const padding = 32; // px-loop-3 is approximately 16px on each side
    const buffer = 40; // Extra buffer to prevent text from getting too close
    const availableWidth =
      containerWidth -
      leadingActionsWidth -
      trailingActionsWidth -
      padding -
      buffer;

    // Measure text width
    if (measureTextRef.current) {
      measureTextRef.current.textContent = text || placeholder;
      const textWidth = measureTextRef.current.offsetWidth;

      // Expand if text is wider than available space
      return textWidth > availableWidth;
    }

    return false;
  };

  // Handle textarea auto-resize
  const autoResizeTextarea = () => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height =
        Math.min(inputRef.current.scrollHeight, 120) + 'px';
    }
  };

  // Handle input change and detect @ mentions
  const handleInputChange = (newValue: string) => {
    onChange(newValue);

    // Store cursor position before expansion state change
    const cursorPosition = inputRef.current?.selectionStart || 0;
    const wasFocused = document.activeElement === inputRef.current;

    // Check if textarea should expand based on available space
    const shouldExpand = shouldExpandTextarea(newValue);
    const wasExpanded = isTextareaExpanded;
    setIsTextareaExpanded(shouldExpand);

    // Auto-resize textarea and restore focus/cursor if expansion state changed
    setTimeout(() => {
      autoResizeTextarea();
      if (wasFocused && wasExpanded !== shouldExpand && inputRef.current) {
        inputRef.current.focus();
        inputRef.current.setSelectionRange(cursorPosition, cursorPosition);
      }
    }, 0);

    // Check for @ mentions
    const atIndex = newValue.lastIndexOf('@');
    if (atIndex !== -1) {
      const textAfterAt = newValue.slice(atIndex + 1);
      if (textAfterAt.includes(' ')) {
        setShowMentions(false);
      }
    } else {
      setShowMentions(false);
    }
  };

  const handleSend = () => {
    if (
      (!value.trim() && attachedFiles.length === 0) ||
      disabled ||
      !agentSelected ||
      isSending
    ) {
      return;
    }

    setIsSending(true);
    setIsTextareaExpanded(false);

    if (attachedFiles.length > 0 && onSendWithFiles) {
      onSendWithFiles(attachedFiles);
    } else if (onSend) {
      onSend();
    }

    onChange('');
    setAttachedFiles([]);

    setTimeout(() => {
      setIsSending(false);
    }, 500);
  };

  const handleRemoveFile = (fileId: string) => {
    setAttachedFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (disabled || !agentSelected) return;

    if (e.key === 'Enter') {
      if (
        !e.shiftKey &&
        (onSend || (attachedFiles.length > 0 && onSendWithFiles))
      ) {
        if (attachedFiles.length > 0 && !value.trim()) {
          e.preventDefault();
          return;
        }

        e.preventDefault();
        handleSend();
      }
    }
    onKeyPress?.(e as any);
  };

  // Handle mention selection

  // Close mentions when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowMentions(false);
    };

    if (showMentions) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showMentions]);

  // Handle textarea expansion state changes
  useEffect(() => {
    if (inputRef.current) {
      const wasFocused = document.activeElement === inputRef.current;
      setTimeout(() => {
        autoResizeTextarea();
        if (wasFocused && inputRef.current) {
          inputRef.current.focus();
        }
      }, 0);
    }
  }, [isTextareaExpanded]);

  // Initial setup and value changes
  useEffect(() => {
    if (value) {
      const shouldExpand = shouldExpandTextarea(value);
      setIsTextareaExpanded(shouldExpand);
      setTimeout(autoResizeTextarea, 0);
    } else {
      setIsTextareaExpanded(false);
    }
  }, [value]);

  // Watch for container and trailing actions size changes
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver(() => {
      if (value) {
        const shouldExpand = shouldExpandTextarea(value);
        setIsTextareaExpanded(shouldExpand);
      }
    });

    resizeObserver.observe(containerRef.current);

    if (trailingActionsRef.current) {
      resizeObserver.observe(trailingActionsRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [value, attachedFiles]);

  useEffect(() => {
    if (initialFiles && initialFiles.length > 0 && capabilities) {
      const validFiles: FileAttachment[] = [];
      const invalidFiles: { file: FileAttachment; reason: string }[] = [];

      initialFiles.forEach((file) => {
        if (file.file) {
          const isSupported = ModelCapabilitiesService.isFileSupportedByModel(
            file.file,
            capabilities,
          );

          if (isSupported) {
            validFiles.push(file);
          } else {
            const reason = ModelCapabilitiesService.getUnsupportedFileMessage(
              file.file,
              capabilities,
            );
            invalidFiles.push({ file, reason });
          }
        } else {
          validFiles.push(file);
        }
      });

      if (invalidFiles.length > 0) {
        const fileNames = invalidFiles
          .map((f) => f.file.file?.name || 'unknown')
          .join(', ');
        toast({
          title: 'Some files were not loaded',
          description: `The following files are not supported by the current model: ${fileNames}`,
          variant: 'destructive',
        });
      }

      if (validFiles.length > 0) {
        setAttachedFiles((prev) => {
          const existingIds = new Set(prev.map((f) => f.id));
          const newFiles = validFiles.filter((f) => !existingIds.has(f.id));
          return [...prev, ...newFiles];
        });
      }
    }
  }, [initialFiles, capabilities, toast]);

  const handleSendClick = () => {
    if (
      !disabled &&
      (value.trim() || attachedFiles.length > 0) &&
      agentSelected
    ) {
      handleSend();
    }
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        'ai-chatbox-container relative rounded-lg bg-white border border-neutral-grayscale-20 shadow-sm',
        className,
      )}
    >
      {/* Hidden element for measuring text width */}
      <div
        ref={measureTextRef}
        className="absolute invisible whitespace-nowrap pointer-events-none text-neutral-grayscale-90"
        style={{
          fontSize: '16px', // Match textarea font size
          fontFamily: 'inherit',
          padding: '0',
        }}
        aria-hidden="true"
      />

      {/* showFileUpload logic removed */}

      {attachedFiles.length > 0 && (
        <div className="px-loop-3 pt-loop-2 pb-loop-2 relative z-10">
          <AttachedFilesList
            files={attachedFiles}
            onRemoveFile={handleRemoveFile}
          />
        </div>
      )}

      {/* isDragOver UI removed */}

      <div className="ai-chatbox-prompt flex flex-col z-[1] relative rounded-lg px-loop-3 py-loop-2 bg-neutral-grayscale-20">
        {/* Expanded textarea area - shown when textarea is expanded */}
        {isTextareaExpanded && (
          <div className="flex-1 relative mb-2">
            <textarea
              ref={inputRef}
              value={value}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyPress={handleKeyPress as any}
              placeholder={agentSelected ? placeholder : 'Ask anything...'}
              className={cn(
                'px-loop-1 py-loop-1 ai-chatbox-textarea w-full resize-none border-none outline-none bg-transparent relative z-0 text-base text-neutral-grayscale-90 placeholder:text-neutral-grayscale-50',
                inputClassName,
              )}
              disabled={disabled || !agentSelected || isSending}
              data-testid="chat-textarea"
            />
          </div>
        )}

        {/* Actions Container - Centered vertically */}
        <div className="ai-chatbox-actions-container flex justify-between items-center">
          {/* Leading Actions */}
          <div
            ref={leadingActionsRef}
            className="ai-chatbox-leading-actions flex items-center"
          >
            <AttachmentMenu
              onFileSelect={onFileSelect || (() => {})}
              disabled={
                disabled ||
                !agentSelected ||
                !capabilities ||
                isLoadingCapabilities
              }
              accept={
                ModelCapabilitiesService.getAcceptAttribute(capabilities) ||
                '*/*'
              }
              multiple={true}
            />
          </div>

          {/* Centered Content Area */}
          <div className="flex items-center space-x-2 flex-1 justify-center">
            {/* Inline textarea - shown when textarea is not expanded */}
            {!isTextareaExpanded && (
              <textarea
                ref={inputRef}
                rows={1}
                value={value}
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyPress={handleKeyPress as any}
                placeholder={agentSelected ? placeholder : 'Ask anything...'}
                className={cn(
                  'px-loop-1 ai-chatbox-textarea flex-1 resize-none border-none outline-none bg-transparent relative z-0 text-base text-neutral-grayscale-90 placeholder:text-neutral-grayscale-50',
                  inputClassName,
                )}
                style={{
                  lineHeight: '1.5',
                  paddingTop: '0.5rem',
                  paddingBottom: '0.5rem',
                }}
                disabled={disabled || !agentSelected || isSending}
                data-testid="chat-textarea"
              />
            )}
          </div>

          {/* Trailing Actions */}
          <div
            ref={trailingActionsRef}
            className={cn(
              'ai-chatbox-trailing-actions flex items-center space-x-2',
              actionsClassName,
            )}
          >
            <div className="w-loop-10 h-loop-10 bg-transparent rounded-md flex items-center justify-center cursor-pointer hover:bg-neutral-grayscale-10 transition-all text-neutral-grayscale-60">
              <MicrophoneIcon
                width={20}
                height={20}
                fill="var(--brand-accent-50)"
              />
            </div>
            {/* Action Chips */}
            {actionChips.map((chip) => (
              <Badge
                key={chip.id}
                variant={chip.variant || 'outline'}
                className={cn(
                  'cursor-pointer hover:opacity-80 transition-opacity h-loop-8 px-loop-3 flex items-center space-x-1',
                  chip.disabled && 'opacity-50 cursor-not-allowed',
                )}
                onClick={chip.disabled ? undefined : chip.onClick}
              >
                {chip.icon && <span className="text-sm">{chip.icon}</span>}
                <span className="text-sm">{chip.label}</span>
              </Badge>
            ))}

            {/* Send Button */}
            {showSendButton && (
              <div className="relative">
                <Button
                  onClick={handleSendClick}
                  disabled={
                    (!value.trim() && attachedFiles.length === 0) ||
                    (attachedFiles.length > 0 && !value.trim()) ||
                    disabled ||
                    !agentSelected
                  }
                  style={{
                    background: agentGradient.background,
                  }}
                  className="w-[70px] h-loop-10 flex hover:opacity-90 transition-opacity duration-300 p-2 rounded-lg"
                  data-testid="chat-send-button"
                >
                  {sendButtonIcon || (
                    <LoopOpsLogo
                      width={40}
                      height={40}
                      fill="white"
                      className="mx-auto"
                    />
                  )}
                </Button>
                {attachedFiles.length > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-brand-accent-50 text-white text-xs">
                    {attachedFiles.length}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
