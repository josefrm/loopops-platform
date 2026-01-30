import React from 'react';
import { ToolCallFile, extractToolCallData } from './ToolCallFile';
import { RunEvent } from './RunStatusTimeline';
import { EventType } from '@/services/streaming/types';

interface ToolCallsListProps {
  events: RunEvent[];
  onDocumentClick: (title: string, content: string) => void;
}

/**
 * Checks if a tool call is an internal operation that should not be displayed
 * Internal operations include: delegate_task_to_member, update_user_memory, etc.
 */
const isInternalToolCall = (toolName: string): boolean => {
  if (!toolName) return false;
  
  const normalizedName = toolName.toLowerCase().trim();
  
  // Internal operation patterns
  const internalPatterns = [
    'delegate_task_to_member',
    'update_user_memory',
    'update_memory',
    'delegate_task',
    'delegate',
    'get_chat_history',
    'create_file',
    'upload_file',
  ];
  
  // Check if tool name matches any internal pattern
  return internalPatterns.some(pattern => 
    normalizedName === pattern || normalizedName.includes(pattern)
  );
};

/**
 * Validates if a tool call result should be displayed
 * Filters out internal tool calls
 */
const isToolCallResult = (event: RunEvent): boolean => {
  // First check if it's a completed tool call event
  if (event.type !== EventType.TEAM_TOOL_CALL_COMPLETED) {
    return false;
  }
  
  // Extract tool data to check tool name
  const toolData = extractToolCallData(event);
  if (!toolData) {
    return false;
  }
  
  // Filter out internal tool calls
  return !isInternalToolCall(toolData.toolName);
};

/**
 * Displays a list of tool call results as clickable files
 * Filters events to show only TeamToolCallCompleted events that are NOT internal operations
 */
export const ToolCallsList: React.FC<ToolCallsListProps> = ({
  events,
  onDocumentClick,
}) => {
  // Filter for completed tool call events and exclude internal operations
  const toolCallEvents = events.filter(isToolCallResult);

  if (toolCallEvents.length === 0) {
    return null;
  }

  return (
    <div className="flex gap-loop-3 flex-wrap justify-end">
      {toolCallEvents.map((event, index) => {
        const toolData = extractToolCallData(event);
        if (!toolData) return null;

        return (
          <ToolCallFile
            key={`tool-${event.timestamp}-${index}`}
            toolCall={toolData}
            onDocumentClick={onDocumentClick}
          />
        );
      })}
    </div>
  );
};
