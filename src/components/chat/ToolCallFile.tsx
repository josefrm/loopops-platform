import React from 'react';
import { Card } from '@/components/ui/card';
import { FileTypeIcon } from '@/components/ui/FileTypeIcon';

interface ToolCallData {
  toolName: string;
  content: any;
}

interface ToolCallFileProps {
  toolCall: ToolCallData;
  onDocumentClick: (title: string, content: string) => void;
}

/**
 * Formats tool call content as markdown for display in DocumentViewer
 */
function formatToolContentAsMarkdown(toolName: string, content: any): string {
  const header = `# ${toolName} Result\n\n`;

  if (!content) {
    return header + '_No output available._';
  }

  if (typeof content === 'string') {
    // Check if it looks like JSON
    if (content.trim().startsWith('{') || content.trim().startsWith('[')) {
      try {
        const parsed = JSON.parse(content);
        return header + '```json\n' + JSON.stringify(parsed, null, 2) + '\n```';
      } catch {
        return header + content;
      }
    }
    return header + content;
  }

  // Format object content as pretty JSON
  try {
    return header + '```json\n' + JSON.stringify(content, null, 2) + '\n```';
  } catch {
    return header + String(content);
  }
}

/**
 * Generates a display-friendly filename from tool name
 */
function generateFileName(toolName: string): string {
  const sanitized = toolName
    .replace(/[^a-z0-9]/gi, '_')
    .replace(/_+/g, '_')
    .toLowerCase();
  return `${sanitized}_result.md`;
}

export const ToolCallFile: React.FC<ToolCallFileProps> = ({
  toolCall,
  onDocumentClick,
}) => {
  const handleClick = () => {
    const fileName = generateFileName(toolCall.toolName);
    const content = formatToolContentAsMarkdown(toolCall.toolName, toolCall.content);
    onDocumentClick(fileName, content);
  };

  const displayName = toolCall.toolName || 'Tool Result';
  const fileName = generateFileName(toolCall.toolName);

  return (
    <Card
      variant="attachment-file"
      className="flex flex-row items-center gap-loop-1 p-loop-3 cursor-pointer hover:shadow-lg transition-shadow"
      onClick={handleClick}
    >
      <FileTypeIcon fileName={fileName} size={24} />
      <span className="text-sm text-neutral-grayscale-50 max-w-[100px] truncate ml-loop-1">
        {displayName}
      </span>
    </Card>
  );
};

/**
 * Extracts tool call data from a TeamToolCallCompleted event
 */
export function extractToolCallData(event: any): ToolCallData | null {
  if (!event || !event.data) {
    return null;
  }

  const eventData = event.data;
  const tool = eventData.tool || {};

  return {
    toolName: tool.name || tool.tool_name || 'Tool Result',
    content: eventData.content || tool.result || tool.output,
  };
}
