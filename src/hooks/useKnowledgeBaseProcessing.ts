import { ReviewFile } from '@/components/review-files/ReviewFileItem';
import { supabase } from '@/integrations/supabase/client';
import { ProjectContextDocument } from '@/models/ProjectContextDocument';
import { useCallback, useState } from 'react';

interface ProcessDocumentRequest {
  storage_key: string;
  project_id: string;
  stage_id: string;
  bucket_name: string;
  summary: string;
  tags: string[];
  category: string;
  workspace_id?: string;
}

interface ProcessDocumentResponse {
  document_id: string;
  status: string;
  message: string;
  processed_at: string;
  bucket_name: string;
}

export const useKnowledgeBaseProcessing = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState<
    Record<string, boolean>
  >({});

  const processDocument = useCallback(
    async (
      document: ProjectContextDocument,
      reviewFile: ReviewFile,
      projectId: string,
      workspaceId: string,
    ): Promise<ProcessDocumentResponse> => {
      if (!document.storagePath || !document.bucketName) {
        throw new Error('Document missing storage information');
      }

      if (!reviewFile.summary || !reviewFile.category) {
        throw new Error('Document missing required metadata');
      }

      setProcessingProgress((prev) => ({ ...prev, [document.id]: true }));

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) {
          throw new Error('Not authenticated');
        }

        // Parse keywords into tags array
        const tags = reviewFile.keywords
          .split(',')
          .map((tag) => tag.trim())
          .filter((tag) => tag.length > 0);

        const request: ProcessDocumentRequest = {
          storage_key: document.storagePath,
          project_id: projectId,
          stage_id: document.stageId,
          bucket_name: document.bucketName,
          summary: reviewFile.summary,
          tags: tags,
          category: reviewFile.category,
          workspace_id: workspaceId,
        };

        const response = await fetch(
          `${
            import.meta.env.VITE_SUPABASE_URL
          }/functions/v1/process-knowledge-base`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(request),
          },
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error || 'Knowledge base processing failed',
          );
        }

        const result: ProcessDocumentResponse = await response.json();
        return result;
      } catch (error) {
        console.error('Error processing document:', error);
        throw error;
      } finally {
        setProcessingProgress((prev) => ({ ...prev, [document.id]: false }));
      }
    },
    [],
  );

  const processMultipleDocuments = useCallback(
    async (
      documents: ProjectContextDocument[],
      reviewFiles: ReviewFile[],
      projectId: string,
      workspaceId: string,
    ): Promise<ProcessDocumentResponse[]> => {
      setIsProcessing(true);
      try {
        const results = await Promise.all(
          documents.map((doc) => {
            const reviewFile = reviewFiles.find((rf) => rf.id === doc.id);
            if (!reviewFile) {
              throw new Error(`Review file not found for document ${doc.id}`);
            }
            return processDocument(doc, reviewFile, projectId, workspaceId);
          }),
        );
        return results;
      } finally {
        setIsProcessing(false);
      }
    },
    [processDocument],
  );

  return {
    processDocument,
    processMultipleDocuments,
    isProcessing,
    processingProgress,
  };
};
