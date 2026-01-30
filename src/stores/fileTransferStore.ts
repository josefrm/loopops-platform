import { create } from 'zustand';
import { FileAttachment } from '@/hooks/useDragAndDrop';

interface TransferData {
  files: FileAttachment[];
  timestamp: number;
}

interface FileTransferState {
  pendingFiles: Map<string, TransferData>;
  addFilesForTransfer: (transferId: string, files: FileAttachment[]) => void;
  getFilesForTransfer: (transferId: string) => FileAttachment[] | undefined;
  clearTransfer: (transferId: string) => void;
  clearAllTransfers: () => void;
  cleanExpiredTransfers: () => void;
}

// Auto-expire transfers after 1 minute
const TRANSFER_EXPIRY_MS = 1 * 60 * 1000;

export const useFileTransferStore = create<FileTransferState>((set, get) => ({
  pendingFiles: new Map(),

  addFilesForTransfer: (transferId: string, files: FileAttachment[]) => {
    // Clean expired transfers before adding new one
    get().cleanExpiredTransfers();
    
    set((state) => {
      const newMap = new Map(state.pendingFiles);
      newMap.set(transferId, {
        files,
        timestamp: Date.now(),
      });
      return { pendingFiles: newMap };
    });
  },

  getFilesForTransfer: (transferId: string) => {
    const transfer = get().pendingFiles.get(transferId);
    
    if (!transfer) {
      return undefined;
    }
    
    // Check if transfer has expired
    if (Date.now() - transfer.timestamp > TRANSFER_EXPIRY_MS) {
      get().clearTransfer(transferId);
      return undefined;
    }
    
    return transfer.files;
  },

  clearTransfer: (transferId: string) => {
    set((state) => {
      const newMap = new Map(state.pendingFiles);
      newMap.delete(transferId);
      return { pendingFiles: newMap };
    });
  },

  clearAllTransfers: () => {
    set({ pendingFiles: new Map() });
  },

  cleanExpiredTransfers: () => {
    set((state) => {
      const newMap = new Map(state.pendingFiles);
      const now = Date.now();
      
      for (const [id, transfer] of newMap.entries()) {
        if (now - transfer.timestamp > TRANSFER_EXPIRY_MS) {
          newMap.delete(id);
        }
      }
      
      return { pendingFiles: newMap };
    });
  },
}));
