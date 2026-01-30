import { X } from 'lucide-react';
import React from 'react';
import { MindspaceEditor } from '../mindspace/MindspaceEditor';
import { CircleControlIcon } from './CircleControlIcon';
import { ControlButton, ControlButtonSize } from './ControlButton';
import { ToolbarPlugin } from './ToolbarPlugin';

export interface ToolbarAction {
  id: string;
  icon?: React.ReactNode;
  label: string;
  onClick: () => void;
  component?: 'icon' | 'button' | 'toolbar-plugin';
  text?: string;
  type?: 'default' | 'transparent' | 'transparent_brand';
  size?: ControlButtonSize;
  buttonClassName?: string;
  position?: 'start' | 'end';
  disabled?: boolean;
}

interface FileEditorProps {
  onClose: () => void;
  placeholder?: string;
  onContentChange?: (content: string) => void;
  toolbarActions?: ToolbarAction[];
  showCloseButton?: boolean;
  className?: string;
  readOnly?: boolean;
  initialContent?: string;
}

export const FileEditor: React.FC<FileEditorProps> = ({
  onClose,
  placeholder = 'Start writing your document...',
  onContentChange,
  toolbarActions = [],
  showCloseButton = true,
  className = '',
  readOnly = false,
  initialContent,
}) => {
  return (
    <div
      className={`flex flex-col overflow-hidden p-loop-6 bg-neutral-grayscale-20 ${className}`}
    >
      <MindspaceEditor
        placeholder={placeholder}
        onContentChange={onContentChange}
        readOnly={readOnly}
        initialContent={initialContent}
        toolbarSlot={
          <div className="flex items-center justify-between w-full flex-shrink-0 rounded-md bg-neutral-grayscale-0 py-loop-1 px-loop-4 mb-loop-12 h-loop-10">
            {/* Toolbar plugin on the left */}
            <div className="flex items-center">
              {toolbarActions
                .filter((action) => action.component === 'toolbar-plugin')
                .map((action) => (
                  <ToolbarPlugin key={action.id} />
                ))}
            </div>

            {/* Icons and buttons on the right */}
            <div className="flex items-center space-x-loop-1">
              {/* All icon components */}
              {toolbarActions
                .filter(
                  (action) => action.component === 'icon' || !action.component,
                )
                .map((action) => (
                  <CircleControlIcon
                    key={action.id}
                    type="gray"
                    size="sm"
                    icon={action.icon}
                    label={action.label}
                    onClick={action.onClick}
                    className="hover:z-[10000] relative"
                  />
                ))}
              {/* All buttons */}
              {toolbarActions
                .filter((action) => action.component === 'button')
                .map((action) => (
                  <ControlButton
                    key={action.id}
                    text={action.text || action.label}
                    type={action.type || 'transparent'}
                    className={action.buttonClassName || ''}
                    onClick={action.onClick}
                    disabled={action.disabled}
                  />
                ))}

              {/* Close button */}
              {showCloseButton && (
                <button
                  onClick={onClose}
                  className="flex items-center justify-center text-neutral-grayscale-60 transition-colors duration-200 hover:text-brand-accent-50"
                  aria-label="Close editor"
                >
                  <X size={20} fill="currentColor" />
                </button>
              )}
            </div>
          </div>
        }
      />
    </div>
  );
};
