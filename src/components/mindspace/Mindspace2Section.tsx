import { useToast } from '@/hooks/use-toast';
import { MindspaceDocument } from '@/models/MindspaceDocument';
import { isFileEditable } from '@/utils/fileUtils';
import {
  Bookmark,
  DownloadCloud,
  Loader2,
  Notebook,
  Trash2,
} from 'lucide-react';
import React from 'react';
import { DocumentViewer } from '../chat/DocumentViewer';
import { ControlButton } from '../ui/ControlButton';
import { LoopOpsIcon } from '../ui/icons/LoopOpsIcon';
import { MindspaceFileEditor } from './MindspaceFileEditor';

interface Mindspace2SectionProps {
  onUploadFiles: () => void;
  onCreateFile: () => void;
  uploadSectionRef?: React.RefObject<HTMLDivElement>;
  // Props for editing existing files
  selectedFile?: MindspaceDocument | null;
  onClearSelection?: () => void;
  isEditorOpen?: boolean; // Explicit prop to indicate if editor should be open
  // Props for bulk actions
  selectedFilesCount?: number; // Number of files selected
  onDownloadSelected?: () => void; // Handler for downloading selected files
  onConvertToDeliverableSelected?: () => void; // Handler for adding selected files to stage
  onDeleteSelected?: () => void; // Handler for deleting selected files
  onClearAndCreate?: () => void; // Handler for clearing selection and opening file editor
  // Props from editor hook
  editorContent?: string;
  editorMode?: 'create' | 'edit';
  isLoadingContent?: boolean;
  isSaving?: boolean;
  onSaveContent?: () => Promise<boolean>;
  onContentChange?: (content: string) => void;
  onConvertToDeliverable?: (fileId: string, fileName: string) => void;
  handleDownload?: () => void;
  onStartLoop?: () => void;
}

export const Mindspace2Section: React.FC<Mindspace2SectionProps> = ({
  onUploadFiles,
  onCreateFile,
  uploadSectionRef,
  selectedFile,
  onClearSelection,
  isEditorOpen = false,
  selectedFilesCount = 0,
  onDownloadSelected,
  onConvertToDeliverableSelected,
  onDeleteSelected,
  onClearAndCreate,
  editorContent,
  editorMode = 'create',
  isLoadingContent = false,
  isSaving = false,
  onSaveContent,
  onContentChange,
  onConvertToDeliverable,
  handleDownload,
  onStartLoop,
}) => {
  const { toast } = useToast();

  const handleCloseEditor = () => {
    onClearSelection?.();
  };

  const handleCopy = () => {
    if (editorContent) {
      navigator.clipboard.writeText(editorContent);
      toast({
        title: 'Copied to clipboard',
        description: 'File content copied to clipboard',
      });
    }
  };

  const handleAddTask = () => {
    if (selectedFile) {
      onConvertToDeliverable?.(
        selectedFile.id.toString(),
        selectedFile.fileName,
      );
    }
  };

  const canCopy =
    selectedFile?.fileName?.endsWith('.md') ||
    selectedFile?.fileName?.endsWith('.txt') ||
    editorMode === 'create' ||
    false;

  // Show loading state while fetching file content
  if (isLoadingContent) {
    return (
      <div className="flex-1 flex items-center justify-center bg-brand-secondary-50">
        <div className="flex items-center gap-2 text-neutral-grayscale-60">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="text-base font-medium">Loading file...</span>
        </div>
      </div>
    );
  }

  // Show editor when state is true
  if (isEditorOpen) {
    // Check if file is view-only (not editable text/markdown)
    const isViewOnly = selectedFile && !isFileEditable(selectedFile.mimeType);

    if (isViewOnly && selectedFile) {
      // For view-only files, use the signed URL or fallback to content (though likely empty for binary)
      // If signedUrl is missing (e.g. local preview?), we might need to handle it.
      // But for Mindspace files, they should have signedUrl from API.
      const viewContent = selectedFile.signedUrl || editorContent || '';

      return (
        <div className="flex-1 flex relative h-full w-full bg-neutral-grayscale-10">
          <DocumentViewer
            isOpen={true}
            onClose={handleCloseEditor}
            documentTitle={selectedFile.fileName}
            documentContent={viewContent}
            onDownload={handleDownload}
            onStartLoop={onStartLoop}
            // we don't pass onEditInMindspace as it's not editable
          />
        </div>
      );
    }

    return (
      <div
        className="flex-1 flex transition-all duration-300"
        data-testid="mindspace-file-editor"
      >
        <MindspaceFileEditor
          key={`${editorMode}-${selectedFile?.id || 'new'}`}
          onClose={handleCloseEditor}
          onSave={onSaveContent}
          onContentChange={onContentChange}
          isSaving={isSaving}
          initialContent={editorContent || ''}
          placeholder={
            editorMode === 'edit'
              ? 'Edit your document...'
              : 'Start writing your document...'
          }
          onConvertToDeliverable={handleAddTask}
          onDownload={handleDownload}
          onCopy={handleCopy}
          canCopy={canCopy}
        />
      </div>
    );
  }
  return (
    <div
      className="flex-1 flex items-center justify-center bg-brand-secondary-50"
      style={{
        padding: '56px',
      }}
      data-testid="mindspace-welcome-section"
    >
      {/* Centered div (460px x 190px) */}
      <div
        className="flex items-center justify-center"
        ref={uploadSectionRef}
        style={{ width: '460px', height: '190px' }}
      >
        {/* Two column layout with emoji fitting content width */}
        <div className="flex gap-loop-6 w-full h-full items-start">
          {/* Left column: Emoji - fits content width, positioned at top */}
          <div className="flex justify-center flex-shrink-0">
            <span className="text-4xl">🤖</span>
          </div>

          {/* Right column: Content - takes remaining space */}
          <div className="flex flex-col justify-center space-y-loop-4">
            <h2
              className="text-3xl font-semibold text-neutral-grayscale-90"
              data-testid="mindspace-welcome-title"
            >
              Hello, I'm your Mindspace Agent
            </h2>
            <p className="text-lg text-neutral-grayscale-60 leading-relaxed">
              I can help you to handle your files and make the best use of them.
            </p>
            {selectedFilesCount > 0 ? (
              <>
                <p className="text-lg font-bold text-neutral-grayscale-60 leading-relaxed">
                  What do we do with these files?
                </p>
                {/* Bulk action buttons */}
                <div className="flex flex-wrap gap-loop-2">
                  <ControlButton
                    type="white"
                    size="lg"
                    fontSize={11}
                    text={`Download (${selectedFilesCount})`}
                    icon={<DownloadCloud width={16} height={16} />}
                    onClick={onDownloadSelected}
                  />
                  <ControlButton
                    type="white"
                    size="lg"
                    fontSize={11}
                    text={`To Artifact (${selectedFilesCount})`}
                    icon={<Bookmark width={16} />}
                    onClick={onConvertToDeliverableSelected}
                  />
                  <ControlButton
                    type="default"
                    size="lg"
                    fontSize={11}
                    text="Start a Loop"
                    icon={<LoopOpsIcon width={16} height={16} />}
                    onClick={onStartLoop}
                  />
                  <ControlButton
                    type="white"
                    size="lg"
                    fontSize={11}
                    text={`Delete files (${selectedFilesCount})`}
                    icon={<Trash2 width={16} height={16} />}
                    onClick={onDeleteSelected}
                  />
                </div>
                {/* Divider */}
                <div className="border-t border-neutral-grayscale-30 my-loop-2" />
                {/* Unselect and create option */}
                <div className="flex items-center gap-loop-2 text-base text-neutral-grayscale-60">
                  <span>Unselect and</span>
                  <ControlButton
                    type="default"
                    size="lg"
                    fontSize={14}
                    text="Create a File"
                    icon={<Notebook width={16} height={16} />}
                    onClick={onClearAndCreate}
                  />
                </div>
              </>
            ) : (
              <>
                <p className="text-lg font-bold text-neutral-grayscale-60 leading-relaxed">
                  You need to add a new file?
                </p>
                <div className="flex space-x-4">
                  <ControlButton
                    size="lg"
                    text="Upload Files"
                    fontSize={14}
                    onClick={onUploadFiles}
                    data-testid="mindspace-section-upload-btn"
                  />
                  <ControlButton
                    size="lg"
                    text="Create a File"
                    fontSize={14}
                    onClick={onCreateFile}
                    data-testid="mindspace-section-create-btn"
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
