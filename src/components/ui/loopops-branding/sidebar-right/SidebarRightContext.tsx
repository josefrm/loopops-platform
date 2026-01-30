import { useToast } from '@/hooks/use-toast';
import { MindspaceFilesService } from '@/services/MindspaceFilesService';
import { useDocumentViewerStore } from '@/stores/documentViewerStore';
import { useMindspaceStore } from '@/stores/mindspaceStore';
import { useWorkspaceProjectStore } from '@/stores/workspaceProjectStore';
import { FolderOpen } from 'lucide-react';
import React, {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  CurtainDirection,
  useCurtainTransition,
} from '../../CurtainTransition';

interface MindspaceItem {
  to: string;
  icon: React.ReactNode;
  label: string;
  type: string;
  active: boolean;
}

interface SidebarRightContextValue {
  mindspaceItem: MindspaceItem;
  documents: any[];
  isLoading: boolean;
  isOnChatPage: boolean;
  isAnimating: boolean;
  onMindspaceClick: () => void;
  onFileClick: (fileName: string) => void;
  onLogoClick: (e: React.MouseEvent) => void;
}

const SidebarRightContext = createContext<SidebarRightContextValue | undefined>(
  undefined,
);

export const useSidebarRightContext = () => {
  const context = useContext(SidebarRightContext);
  if (!context) {
    throw new Error(
      'useSidebarRightContext must be used within SidebarRightProvider',
    );
  }
  return context;
};

interface SidebarRightProviderProps {
  children: ReactNode;
}

export const SidebarRightProvider: React.FC<SidebarRightProviderProps> = ({
  children,
}) => {
  const location = useLocation();
  const navigate = useNavigate();

  // Use workspaceProjectStore (as per project rules)
  const currentWorkspaceId = useWorkspaceProjectStore(
    (state) => state.currentWorkspaceId,
  );
  const currentProjectId = useWorkspaceProjectStore(
    (state) => state.currentProjectId,
  );

  // Use mindspaceStore with individual selectors (prevents re-render issues)
  const documents = useMindspaceStore((state) => state.documents);
  const isLoading = useMindspaceStore((state) => state.documentsLoading);
  const fetchDocuments = useMindspaceStore((state) => state.fetchDocuments);

  const { openDocument } = useDocumentViewerStore();
  const { toast } = useToast();
  const { triggerCurtain, isAnimating } = useCurtainTransition();

  // Fetch documents when workspace/project changes (only on initial load)
  const hasFetchedRef = useRef(false);
  useEffect(() => {
    // Only fetch if we haven't fetched yet and have valid IDs
    if (currentWorkspaceId && currentProjectId && !hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchDocuments(currentWorkspaceId, currentProjectId);
    }
  }, [currentWorkspaceId, currentProjectId, fetchDocuments]);

  // Handler for curtain navigation
  const handleCurtainNavigation = useCallback(
    (targetPath: string, direction: CurtainDirection) => {
      if (isAnimating) return; // Prevent multiple triggers

      triggerCurtain(
        direction,
        () => {
          // This is called at the midpoint when the curtain fully covers the screen
          navigate(targetPath);
        },
        () => {},
      );
    },
    [isAnimating, triggerCurtain, navigate],
  );

  const mindspaceItem = useMemo(
    () => ({
      to: '/mindspace',
      icon: <FolderOpen size={20} color="var(--neutral-grayscale-0)" />,
      label: 'Mindspace',
      type: 'default',
      active: location.pathname === '/mindspace',
    }),
    [location.pathname],
  );

  const isOnChatPage = useMemo(
    () => location.pathname === '/chat',
    [location.pathname],
  );

  const handleMindspaceClick = useCallback(() => {
    if (isOnChatPage) {
      // From Chat -> Mindspace: right-to-left
      handleCurtainNavigation('/mindspace', 'right-to-left');
    } else {
      // Regular navigation for non-chat pages
      navigate('/mindspace');
    }
  }, [isOnChatPage, handleCurtainNavigation, navigate]);

  // Handler for logo click - navigate to Project Context with curtain
  const handleLogoClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      // From Mindspace -> Project Context: left-to-right
      // From other pages -> Project Context: left-to-right
      handleCurtainNavigation('/', 'left-to-right');
    },
    [handleCurtainNavigation],
  );

  const handleFileClick = useMemo(
    () => async (fileName: string) => {
      const document = documents.find((doc) => doc.fileName === fileName);

      if (!document?.id) {
        toast({
          title: 'Error',
          description: 'File ID not available',
          variant: 'destructive',
        });
        return;
      }

      try {
        const isPdf = fileName.toLowerCase().endsWith('.pdf');
        if (isPdf && document.signedUrl) {
          openDocument(fileName, document.signedUrl);
        } else {
          const content = await MindspaceFilesService.getFileContent(
            document.id,
          );
          openDocument(fileName, content);
        }
      } catch (error) {
        console.error('Error loading file:', error);
        toast({
          title: 'Error',
          description: 'Failed to load file content',
          variant: 'destructive',
        });
      }
    },
    [documents, openDocument, toast],
  );

  const value = useMemo(
    () => ({
      mindspaceItem,
      documents,
      isLoading,
      isOnChatPage,
      isAnimating,
      onMindspaceClick: handleMindspaceClick,
      onFileClick: handleFileClick,
      onLogoClick: handleLogoClick,
    }),
    [
      mindspaceItem,
      documents,
      isLoading,
      isOnChatPage,
      isAnimating,
      handleFileClick,
      handleMindspaceClick,
      handleLogoClick,
    ],
  );

  return (
    <SidebarRightContext.Provider value={value}>
      {children}
    </SidebarRightContext.Provider>
  );
};
