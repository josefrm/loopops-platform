import React from 'react';
import { FileEditor } from '../ui/FileEditor';
import { getMindspaceToolbarActions } from '../ui/ToolbarConfigs';

interface MindspaceFileEditorProps {
  onClose: () => void;
  onContentChange?: (content: string) => void;
  onSave?: () => void;
  placeholder?: string;
  isSaving?: boolean;
  initialContent?: string;
  onConvertToDeliverable?: () => void;
  onDownload?: () => void;
  onCopy?: () => void;
  canCopy?: boolean;
}

// Backward compatibility wrapper using the new FileEditor
export const MindspaceFileEditor: React.FC<MindspaceFileEditorProps> = ({
  onClose,
  onContentChange,
  onSave,
  placeholder = 'Start writing your document...',
  isSaving = false,
  initialContent,
  onConvertToDeliverable,
  onDownload,
  onCopy,
  canCopy,
}) => {
  return (
    <FileEditor
      onClose={onClose}
      onContentChange={
        onContentChange ||
        ((content) => {
          console.log('Content changed:', content);
        })
      }
      placeholder={placeholder}
      toolbarActions={getMindspaceToolbarActions(
        onSave,
        isSaving,
        onConvertToDeliverable,
        onDownload,
        onCopy,
        canCopy,
      )}
      showCloseButton={true}
      className="w-full"
      initialContent={initialContent}
    />
  );
};
