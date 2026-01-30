import { useAuth } from '@/contexts/AuthContext';
import { useSessionStore } from '@/features/chat/stores/sessionStore';
import { FileAttachment } from '@/hooks/useDragAndDrop';
import { useStageTemplate } from '@/hooks/useStageTemplate';
import { StageTemplateService } from '@/services/StageTemplateService';
import { useFileTransferStore } from '@/stores/fileTransferStore';
import { useWorkspaceProjectStore } from '@/stores/workspaceProjectStore';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { useToast } from './use-toast';

interface TransferFileData {
  id: string;
  fileName: string;
  signedUrl: string;
  mimeType?: string;
}

interface TransferOptions {
  sessionId?: string;
  stageId?: string | number;

  createNewSession?: boolean;
}

export const useFileTransfer = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { addFilesForTransfer } = useFileTransferStore();
  const { user } = useAuth();
  const currentWorkspace = useWorkspaceProjectStore((state) =>
    state.getCurrentWorkspace(),
  );
  const { stageTemplate } = useStageTemplate();

  const transferFilesToChat = async (
    files: TransferFileData | TransferFileData[],
    options?: TransferOptions,
  ): Promise<void> => {
    const fileArray = Array.isArray(files) ? files : [files];

    if (fileArray.length === 0) {
      toast({
        title: 'No files to transfer',
        description: 'Please select at least one file.',
        variant: 'destructive',
      });
      return;
    }

    try {
      let sessionId = options?.sessionId;
      let newTabId: string | undefined;

      if (options?.createNewSession && !sessionId) {
        toast({
          title: 'Creating new loop',
          description: 'Starting a new chat session with your file...',
        });

        // Crear un tab temporal en el store
        newTabId = `tab-${Date.now()}`;
        const tempSessionId = `session-${Date.now()}`;

        useSessionStore.getState().createSession(newTabId, {
          sessionId: tempSessionId,
          title: 'Loop',
          stageId: options?.stageId ? Number(options.stageId) : undefined,
          isCreating: true,
        });

        // Crear la sesión real
        const sessionType = stageTemplate?.type || 'team';
        const sessionResponse = await StageTemplateService.createSession({
          sessionName: 'Loop',
          userId: user.id,
          workspaceId: currentWorkspace.id,
          sessionType: sessionType as 'agent' | 'team' | 'workflow',
          componentId: stageTemplate?.id,
        });
        sessionId = sessionResponse.session_id;

        // Actualizar el tab con el sessionId real
        useSessionStore.getState().updateSession(newTabId, {
          sessionId,
          title: 'Loop',
          isCreating: false,
        });

        useSessionStore.getState().setActiveSession(sessionId);

        if (stageTemplate?.id) {
          useSessionStore
            .getState()
            .setStageActiveTab(stageTemplate.id, newTabId);
        }
      }

      toast({
        title: 'Loading files',
        description: `Preparing ${fileArray.length} file(s) for chat...`,
      });

      const fileAttachments = await Promise.all(
        fileArray.map(async (fileData): Promise<FileAttachment> => {
          const response = await fetch(fileData.signedUrl);
          if (!response.ok) {
            throw new Error(`Failed to download ${fileData.fileName}`);
          }

          const blob = await response.blob();
          const file = new File([blob], fileData.fileName, {
            type: fileData.mimeType || blob.type,
          });

          return {
            id: fileData.id,
            name: fileData.fileName,
            size: file.size,
            type: file.type,
            file: file,
            uploadStatus: 'pending' as const,
            url: fileData.signedUrl,
            mindspaceFileId: fileData.id,
            isMindspaceReference: true,
          };
        }),
      );

      const transferId = uuidv4();

      addFilesForTransfer(transferId, fileAttachments);

      // Siempre navegar al chat (ruta '/')
      const params = new URLSearchParams();
      params.set('transferId', transferId);

      if (sessionId) {
        params.set('session_id', sessionId);
      }
      if (options?.stageId) {
        params.set('stage', options.stageId.toString());
      }

      // Navegar siempre al chat
      navigate(`/chat?${params.toString()}`);
    } catch (error) {
      toast({
        title: 'Transfer failed',
        description:
          error instanceof Error
            ? error.message
            : 'Failed to prepare files for chat.',
        variant: 'destructive',
      });
      throw error; // Re-lanzar el error para que el llamador pueda manejarlo si es necesario
    }
  };

  return {
    transferFilesToChat,
  };
};
