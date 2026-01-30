import { supabase } from '@/integrations/supabase/client';
import { ProjectContextDocument } from '@/models/ProjectContextDocument';
import { useCallback, useState } from 'react';

interface ExtractMetadataRequest {
  storage_key: string;
  bucket_name: string;
  project_id: string;
  stage_id: string;
  workspace_id?: string;
}

interface ExtractMetadataResponse {
  summary: string;
  tags: string[];
  category: string;
}

export const useMetadataExtraction = () => {
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionProgress, setExtractionProgress] = useState<
    Record<string, boolean>
  >({});

  const extractMetadata = useCallback(
    async (
      document: ProjectContextDocument,
      projectId: string,
      workspaceId?: string,
    ): Promise<ProjectContextDocument> => {
      if (!document.storagePath || !document.bucketName) {
        throw new Error('Document missing storage information');
      }

      setExtractionProgress((prev) => ({ ...prev, [document.id]: true }));

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) {
          throw new Error('Not authenticated');
        }

        const request: ExtractMetadataRequest = {
          storage_key: document.storagePath,
          bucket_name: document.bucketName,
          project_id: projectId,
          stage_id: document.stageId,
          ...(workspaceId && { workspace_id: workspaceId }),
        };

        const response = await fetch(
          `${
            import.meta.env.VITE_SUPABASE_URL
          }/functions/v1/extract-mindspace-metadata`,
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
          throw new Error(errorData.error || 'Metadata extraction failed');
        }

        const metadata: ExtractMetadataResponse = await response.json();

        return {
          ...document,
          summary: metadata.summary,
          tags: metadata.tags,
          category: metadata.category,
        };
      } catch (error) {
        console.error('Error extracting metadata:', error);
        throw error;
      } finally {
        setExtractionProgress((prev) => ({ ...prev, [document.id]: false }));
      }
    },
    [],
  );

  const extractMetadataForMultiple = useCallback(
    async (
      documents: ProjectContextDocument[],
      projectId: string,
      workspaceId?: string,
    ): Promise<ProjectContextDocument[]> => {
      setIsExtracting(true);
      try {
        const results = await Promise.all(
          documents.map((doc) =>
            extractMetadata(doc, projectId, workspaceId).catch((error) => {
              console.error(
                `Failed to extract metadata for ${doc.fileName}:`,
                error,
              );
              // Return document without metadata on error
              return doc;
            }),
          ),
        );
        return results;
      } finally {
        setIsExtracting(false);
      }
    },
    [extractMetadata],
  );

  return {
    extractMetadata,
    extractMetadataForMultiple,
    isExtracting,
    extractionProgress,
  };
};
