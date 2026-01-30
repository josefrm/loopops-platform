import { useToast } from '@/hooks/use-toast';
import { MindspaceDocument } from '@/models/MindspaceDocument';
import { useCallback, useRef, useState } from 'react';

interface UseMindspaceEditorProps {
  fetchFileContent?: (fileId: string) => Promise<string | null>;
  updateMarkdownFile?: (
    fileId: string,
    content: string,
    originalFileName?: string,
  ) => Promise<{ success: boolean; file?: any }>;
  createMarkdownFile: (
    content: string,
    fileName?: string,
  ) => Promise<{ success: boolean; file?: any }>;
}

export const useMindspaceEditor = ({
  fetchFileContent,
  updateMarkdownFile,
  createMarkdownFile,
}: UseMindspaceEditorProps) => {
  const { toast } = useToast();
  // Editor visibility and loading state
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Editor mode: 'create' | 'edit'
  const [mode, setMode] = useState<'create' | 'edit'>('create');

  // Currently loaded file and content
  const [currentFile, setCurrentFile] = useState<MindspaceDocument | null>(
    null,
  );
  const [content, setContent] = useState<string>('');

  // Refs to track state without causing dependency issues
  const contentRef = useRef<string>('');
  const currentFileRef = useRef<MindspaceDocument | null>(null);
  const isEditorOpenRef = useRef<boolean>(false);
  const modeRef = useRef<'create' | 'edit'>('create');

  // Update refs when state changes
  currentFileRef.current = currentFile;
  isEditorOpenRef.current = isEditorOpen;
  modeRef.current = mode;

  // Open editor in create mode
  const openCreateMode = useCallback(() => {
    console.log('[useMindspaceEditor] openCreateMode');
    setMode('create');
    setCurrentFile(null);
    setContent('');
    contentRef.current = '';
    setIsEditorOpen(true);
  }, []);

  // Open editor in edit mode with a specific file
  const openEditMode = useCallback(
    async (file: MindspaceDocument) => {
      console.log('[useMindspaceEditor] openEditMode:', file.fileName);

      // If the same file is already open, don't reload
      if (
        currentFileRef.current?.id === file.id &&
        isEditorOpenRef.current &&
        modeRef.current === 'edit'
      ) {
        console.log('[useMindspaceEditor] File already open, skipping reload');
        return;
      }

      const { isFileEditable } = await import('@/utils/fileUtils');
      const editable = isFileEditable(file.mimeType);

      setIsLoadingContent(true);
      setMode('edit');
      setCurrentFile(file);
      setIsEditorOpen(true);

      // Skip fetching content for non-editable files (images, PDFs, etc.)
      // Word documents are now considered editable
      if (!editable) {
        console.log(
          '[useMindspaceEditor] File is not editable, skipping content fetch',
        );
        setContent('');
        contentRef.current = '';
        setIsLoadingContent(false);
        return;
      }

      try {
        const fileContent = await fetchFileContent(file.id);
        if (fileContent !== null) {
          console.log(
            '[useMindspaceEditor] Content loaded:',
            fileContent.substring(0, 50) + '...',
          );
          setContent(fileContent);
          contentRef.current = fileContent;

          // Show info for Word documents
          const isWordDocument =
            file.fileName.endsWith('.docx') || file.fileName.endsWith('.doc');
          if (isWordDocument) {
            toast({
              title: 'Editing Word Document',
              description:
                'You are editing a Word document as plain text. Original formatting will be lost when saved.',
            });
          }
        } else {
          console.error('[useMindspaceEditor] Failed to load content');
          // Don't call closeEditor here to avoid issues - just reset states
          setIsEditorOpen(false);
          setMode('create');
          setCurrentFile(null);
          setContent('');
          contentRef.current = '';
        }
      } catch (error) {
        console.error('[useMindspaceEditor] Error loading content:', error);
        // Reset on error
        setIsEditorOpen(false);
        setMode('create');
        setCurrentFile(null);
        setContent('');
        contentRef.current = '';
      } finally {
        setIsLoadingContent(false);
      }
    },
    [fetchFileContent, toast],
  );

  // Close the editor
  const closeEditor = useCallback(() => {
    console.log('[useMindspaceEditor] closeEditor');
    setIsEditorOpen(false);
    setMode('create');
    setCurrentFile(null);
    setContent('');
    contentRef.current = '';
  }, []);

  // Update content (called by the editor on change)
  const updateContent = useCallback((newContent: string) => {
    contentRef.current = newContent;
  }, []);

  // Save the current content
  const saveContent = useCallback(async () => {
    const currentMode = modeRef.current;
    const fileToUpdate = currentFileRef.current;

    console.log('[useMindspaceEditor] saveContent:', {
      mode: currentMode,
      currentFileId: fileToUpdate?.id,
    });

    setIsSaving(true);

    try {
      let result: { success: boolean; file?: any };

      if (currentMode === 'edit' && fileToUpdate && updateMarkdownFile) {
        // Update existing file
        console.log(
          '[useMindspaceEditor] Updating file:',
          fileToUpdate.fileName,
        );
        result = await updateMarkdownFile(
          fileToUpdate.id,
          contentRef.current,
          fileToUpdate.fileName,
        );
      } else {
        // Create new file
        console.log('[useMindspaceEditor] Creating new file');
        result = await createMarkdownFile(contentRef.current);
      }

      if (result.success) {
        console.log('[useMindspaceEditor] Save successful');

        // If we created a new file, switch to edit mode with that file
        if (currentMode === 'create' && result.file) {
          console.log(
            '[useMindspaceEditor] Switching to edit mode with new file:',
            result.file.fileName,
          );
          setMode('edit');
          // result.file is a MindspaceDocument with camelCase properties
          setCurrentFile({
            id: result.file.id,
            fileName: result.file.fileName,
            fileSize: result.file.fileSize,
            fileType: result.file.fileType || 'markdown',
            mimeType: result.file.mimeType,
            isUploaded: true,
            uploadProgress: 100,
            createdAt: result.file.createdAt,
            signedUrl: result.file.signedUrl,
            createdInEditor: true,
          });

          // Reload content from server to ensure we have the latest
          if (fetchFileContent && result.file.id) {
            const freshContent = await fetchFileContent(result.file.id);
            if (freshContent !== null) {
              setContent(freshContent);
              contentRef.current = freshContent;
            }
          }
        }

        // If we updated a file, update currentFile with new data and reload content from server
        if (currentMode === 'edit' && fileToUpdate) {
          // Update currentFile with any changed data (e.g., mimeType for Word docs converted to markdown)
          if (result.file) {
            setCurrentFile((prev) =>
              prev
                ? {
                    ...prev,
                    mimeType: result.file?.mimeType || prev.mimeType,
                    fileSize: result.file?.fileSize || prev.fileSize,
                    signedUrl: result.file?.signedUrl || prev.signedUrl,
                  }
                : prev,
            );
          }

          // Reload content from server to ensure we have the latest
          if (fetchFileContent) {
            const freshContent = await fetchFileContent(fileToUpdate.id);
            if (freshContent !== null) {
              setContent(freshContent);
              contentRef.current = freshContent;
            }
          }
        }

        return true;
      }

      return false;
    } catch (error) {
      console.error('[useMindspaceEditor] Error saving:', error);
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [updateMarkdownFile, createMarkdownFile, fetchFileContent]);

  return {
    // State
    isEditorOpen,
    isLoadingContent,
    isSaving,
    mode,
    currentFile,
    content,

    // Actions
    openCreateMode,
    openEditMode,
    closeEditor,
    updateContent,
    saveContent,
  };
};
