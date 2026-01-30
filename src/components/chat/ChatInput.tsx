import { AgentTeamOption } from '@/components/ui/agents/AgentTeamPicker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { agentGradient } from '@/components/ui/loopops-branding/BrandGradient';
import { LoopOpsLogo } from '@/components/ui/loopops-branding/LoopOpsLogo';
import { Agent } from '@/models/Agent';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AgentTeamMentionSelector } from '../ui/agents/AgentTeamMentionSelector';

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

interface ChatInputProps {
  value: string;
  placeholder: string;
  disabled: boolean;
  agentSelected?: boolean;
  agents?: Agent[];
  onChange: (value: string) => void;
  onSend: () => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
  onMentionSelect?: (mentions: MentionItem[]) => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  value,
  placeholder,
  disabled,
  agentSelected = true,
  agents = [],
  onChange,
  onSend,
  onKeyPress,
  onMentionSelect,
}) => {
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionStartPos, setMentionStartPos] = useState(-1);
  const [selectedMentions, setSelectedMentions] = useState<MentionItem[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [textSegments, setTextSegments] = useState<TextSegment[]>([
    { id: 'initial', type: 'text', content: '' },
  ]);
  const inputRef = useRef<HTMLInputElement>(null);

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

  // Parse text with mentions into segments
  const parseTextToSegments = useCallback(
    (text: string, mentions: MentionItem[] = []): TextSegment[] => {
      const segments: TextSegment[] = [];
      const mentionRegex = /@(\w+)/g;
      let lastIndex = 0;
      let match;
      let segmentId = Date.now(); // Use timestamp for more stable IDs

      while ((match = mentionRegex.exec(text)) !== null) {
        // Add text before mention
        if (match.index > lastIndex) {
          const textContent = text.slice(lastIndex, match.index);
          if (textContent) {
            segments.push({
              id: `text-${segmentId++}-${match.index}`, // Include position for uniqueness
              type: 'text',
              content: textContent,
            });
          }
        }

        // Find matching mention
        const mentionKey = match[1];
        const foundMention = mentions.find(
          (m) => m.key === mentionKey || m.name === mentionKey,
        );

        if (foundMention) {
          segments.push({
            id: `mention-${foundMention.id}-${match.index}`, // Use mention ID + position
            type: 'mention',
            content: `@${mentionKey}`,
            mention: foundMention,
          });
        } else {
          // If no matching mention found, treat as text
          segments.push({
            id: `text-unknown-${segmentId++}-${match.index}`,
            type: 'text',
            content: match[0],
          });
        }

        lastIndex = match.index + match[0].length;
      }

      // Add remaining text
      if (lastIndex < text.length) {
        segments.push({
          id: `text-end-${segmentId++}-${lastIndex}`, // Include position for uniqueness
          type: 'text',
          content: text.slice(lastIndex),
        });
      }

      return segments.length > 0
        ? segments
        : [{ id: 'empty', type: 'text', content: '' }];
    },
    [],
  );

  // Handle value changes from parent
  useEffect(() => {
    // Only update if the computed plain text differs from the current value
    const currentPlainText = getPlainText(textSegments);

    if (!value) {
      // Clear everything when value is empty
      if (currentPlainText !== '') {
        setTextSegments([{ id: 'initial', type: 'text', content: '' }]);
        setSelectedMentions([]);
      }
    } else if (currentPlainText !== value) {
      // Only parse if the text actually changed
      const newSegments = parseTextToSegments(value, selectedMentions);
      setTextSegments(newSegments);

      // Clear selected mentions if value is empty (redundant check but safe)
      if (!value.trim()) {
        setSelectedMentions([]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, parseTextToSegments, selectedMentions]);

  const createAgentOptions = (agents: Agent[]): AgentTeamOption[] => {
    return agents.map((agent) => ({
      id: agent.id,
      type: 'agent' as const,
      agent,
      selected: selectedMentions.some(
        (mention) => mention.id === agent.id && mention.type === 'agent',
      ),
    }));
  };

  // Filter options based on search query
  const filterOptions = (
    options: AgentTeamOption[],
    query: string,
  ): AgentTeamOption[] => {
    if (!query) return options;

    const lowercaseQuery = query.toLowerCase();
    return options.filter((option) => {
      if (option.type === 'agent' && option.agent) {
        return (
          option.agent.name?.toLowerCase().includes(lowercaseQuery) ||
          option.agent.key?.toLowerCase().includes(lowercaseQuery)
        );
      }
      if (option.type === 'team' && option.team) {
        return (
          option.team.name?.toLowerCase().includes(lowercaseQuery) ||
          option.team.key?.toLowerCase().includes(lowercaseQuery)
        );
      }
      return false;
    });
  };

  // Combine teams and agents into mention options
  const allOptions = [...createAgentOptions(agents)];

  // Filter options based on current query
  const filteredOptions = filterOptions(allOptions, mentionQuery);

  // Handle input change and detect @ mentions
  const handleInputChange = (newValue: string) => {
    // Just call onChange - let the useEffect handle the segment parsing
    onChange(newValue);

    // Check for @ mentions
    const atIndex = newValue.lastIndexOf('@');
    if (atIndex !== -1) {
      const textAfterAt = newValue.slice(atIndex + 1);
      if (textAfterAt.includes(' ')) {
        // If there's a space after @, hide mentions
        setShowMentions(false);
      } else {
        // Show mentions and set query
        setMentionQuery(textAfterAt);
        setMentionStartPos(atIndex);
        setShowMentions(true);
      }
    } else {
      setShowMentions(false);
    }
  };

  // Unified send handler
  const handleSend = () => {
    if (!value.trim() || disabled || !agentSelected || isSending) {
      return;
    }

    setIsSending(true);

    // Clear the input immediately
    onChange('');

    // Call the onSend callback
    onSend();

    // Reset sending state after a short delay to prevent rapid clicking
    setTimeout(() => {
      setIsSending(false);
    }, 500);
  };

  // Handle key press events
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Prevent key press when disabled or no agent selected
    if (disabled || !agentSelected) return;

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    // Call the original onKeyPress if provided
    onKeyPress?.(e);
  };

  // Handle mention selection
  const handleMentionSelect = (option: AgentTeamOption) => {
    if (mentionStartPos === -1) return;

    // Don't allow selecting already selected items
    if (option.selected) return;

    // Convert AgentTeamOption to MentionItem
    const item: MentionItem =
      option.type === 'agent' && option.agent
        ? {
            id: option.agent.id,
            name: option.agent.name,
            key: option.agent.key,
            color: option.agent.color || option.agent.color,
            type: 'agent',
          }
        : {
            id: option.team!.id,
            name: option.team!.name,
            key: option.team!.key,
            color: option.team!.color,
            type: 'team',
          };

    // Get current plain text from segments
    const currentText = getPlainText(textSegments);
    const beforeMention = currentText.slice(0, mentionStartPos);
    const afterMention = currentText.slice(
      mentionStartPos + mentionQuery.length + 1,
    );
    const displayText = item.key || item.name;
    const newValue =
      `${beforeMention}@${displayText} ${afterMention}`.trimEnd();

    // Update the input value directly and set cursor position
    onChange(newValue);
    setShowMentions(false);
    setMentionStartPos(-1);
    setMentionQuery('');

    // Add to selected mentions and notify parent
    const updatedMentions = [...selectedMentions, item];
    setSelectedMentions(updatedMentions);
    onMentionSelect?.(updatedMentions);

    // Focus back to input and set cursor position after the mention + space
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        // Set cursor position after the mention and space
        const newCursorPos = beforeMention.length + displayText.length + 2; // +1 for @, +1 for space
        inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

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

  // Prevent sending when disabled or no value
  const handleSendClick = () => {
    if (!disabled && value.trim() && agentSelected) {
      onSend();
    }
  };

  return (
    <div
      className="border-slate-200 flex-shrink-0 bg-white/30 relative"
      style={{ backdropFilter: 'blur(1px)' }}
    >
      {/* Mention Suggestions using AgentTeamPicker */}
      {showMentions && filteredOptions.length > 0 && (
        <div className="absolute bottom-full left-4 right-4 mb-2 z-50 w-fit">
          <AgentTeamMentionSelector
            options={filteredOptions}
            onSelect={handleMentionSelect}
            maxItemsPerColumn={8}
          />
        </div>
      )}

      <div className="flex space-x-2">
        <div className="relative w-[92%]">
          {/* Hidden overlay for mentions */}
          <div
            className="absolute inset-0 pointer-events-none px-3 py-2 flex items-center flex-wrap gap-1"
            style={{
              fontSize: '14px',
              lineHeight: '20px',
              color: 'transparent',
            }}
          >
            {textSegments.map((segment, index) => {
              if (segment.type === 'mention' && segment.mention) {
                return (
                  <span
                    key={`overlay-${segment.id}-${index}`}
                    style={{ display: 'inline' }}
                  >
                    <span
                      className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200"
                      style={{
                        backgroundColor: '#e0f2fe',
                        color: '#0277bd',
                        border: '1px solid #81d4fa',
                        borderRadius: '6px',
                        padding: '1px 6px',
                        fontSize: '12px',
                        fontWeight: '500',
                        whiteSpace: 'nowrap',
                        position: 'relative',
                        zIndex: 1,
                      }}
                    >
                      @{segment.mention.key || segment.mention.name}
                    </span>
                    <span style={{ color: 'transparent' }}> </span>
                  </span>
                );
              } else {
                return (
                  <span
                    key={`overlay-${segment.id}-${index}`}
                    style={{ color: 'transparent' }}
                  >
                    {segment.content}
                  </span>
                );
              }
            })}
          </div>

          {/* Actual input field */}
          <Input
            ref={inputRef as any}
            value={value}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyPress={handleKeyPress as any}
            placeholder={
              agentSelected ? placeholder : 'Please select an agent first...'
            }
            className="w-full h-loop-10 border-none flex rounded-sm hover:shadow-lg hover:shadow-cyan-500/50 duration-300 transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-neutral-grayscale-40 relative z-0"
            style={{
              boxShadow: '0 10px 30px 0 rgba(0, 0, 0, 0.10)',
              color: '#666666',
              fontSize: '14px',
              fontStyle: 'normal',
              fontWeight: 400,
              backgroundColor: 'transparent',
            }}
            disabled={disabled || !agentSelected || isSending}
          />
        </div>
        <Button
          onClick={handleSendClick}
          disabled={!value.trim() || disabled || !agentSelected}
          style={{
            background: agentGradient.background,
          }}
          className="w-[70px] h-loop-10 flex hover:opacity-90 transition-opacity duration-300 p-2 rounded-sm"
        >
          <LoopOpsLogo
            width={40}
            height={40}
            fill="white"
            className="mx-auto"
          />
        </Button>
      </div>
    </div>
  );
};
