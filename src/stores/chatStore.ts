/**
 * chatStore.ts - Re-exports for compatibility
 * Este archivo solo exporta el tipo ChatTab para imports antiguos
 */

// Re-export type for compatibility with navigationHelpers.ts
export interface ChatTab {
  id: string;
  sessionId?: string;
  title?: string;
  stageId?: number;
  isCreating?: boolean;
  isDeleting?: boolean;
}
