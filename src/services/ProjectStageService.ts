import { ProjectItem } from '../components/projectContext/ProjectContextTypes';
import { Stage } from '../components/projectContext/TabNavigationControl';
import { callSupabaseFunction } from '../utils/supabaseHelper';

// Edge function response interface
interface EdgeFunctionResponse {
  category_id: number;
  items: Array<{
    id: string; // Changed to support UUIDs
    title: string;
    description: string;
    created_at: string; // ISO string
    updated_at: string; // ISO string
    fileSize: number;
    isDeliverable: boolean;
    isKeyDeliverable?: boolean;
  }>;
}

// Files function response interface (different structure)
interface FilesResponse {
  files: Array<{
    id: string;
    file_name: string;
    file_size: number;
    mime_type: string;
    signed_url: string;
    created_at: string;
    file_in_project_context: boolean;
    created_in_editor: boolean;
    is_deliverable: boolean;
    is_key_deliverable?: boolean;
  }>;
  total_count: number;
  stage_bucket_id: string | null;
}

// Mock API service
export const ProjectStageService = {
  /**
   * Fetch all available categories
   * @param projectId - Optional project ID to fetch stages from database
   */
  getStages: async (projectId?: string): Promise<Stage[]> => {
    // If projectId is provided, fetch from edge function
    if (projectId) {
      try {
        const response = await callSupabaseFunction<any>(
          'get-project-stages',
          {
            project_id: projectId,
          },
          {
            timeout: 60000, // 1 minute timeout
          },
        );
        const stagesArray = Array.isArray(response)
          ? response
          : response?.stages || [];

        const categories: Stage[] = stagesArray.map((stage: any) => ({
          id: stage.priority,
          name: stage.name,
          priority: stage.priority,
          project_stage_id: stage.project_stage_id || stage.id,
          template_id: stage.template_id,
        }));

        // Sort by priority to ensure correct order
        categories.sort((a, b) => a.priority - b.priority);

        // If we have categories, return them
        if (categories.length > 0) {
          return categories;
        }

        return [];
      } catch (error) {
        console.error('Error calling get-project-stages edge function:', error);
        return [];
      }
    }

    // Return empty list if no projectId provided
    return [];
  },

  /**
   * Process a stage file for the knowledge base
   * @param stageFileId - UUID of the stage file to process
   * @param metadata - Metadata for the file (summary, tags, category)
   */
  processStageFileForKnowledgeBase: async (
    stageFileId: string,
    metadata: { summary: string; tags: string[]; category: string },
  ): Promise<{
    success: boolean;
    stage_file_id: string;
    message?: string;
    error?: string;
  }> => {
    try {
      const response = await callSupabaseFunction<{
        success: boolean;
        message: string;
        results: Array<{
          stage_file_id: string;
          success: boolean;
          error?: string;
        }>;
        summary: {
          total: number;
          succeeded: number;
          failed: number;
        };
      }>('process-knowledge-base', {
        stage_file_id: stageFileId,
        file_metadata: {
          [stageFileId]: metadata,
        },
      } as any);

      const result = response.results?.[0];
      return {
        success: result?.success ?? false,
        stage_file_id: stageFileId,
        message: response.message,
        error: result?.error,
      };
    } catch (error) {
      console.error('Error processing stage file for knowledge base:', error);
      throw error;
    }
  },

  /**
   * Bulk process stage files for the knowledge base
   * @param files - Array of file objects with ID and metadata
   */
  bulkProcessStageFilesForKnowledgeBase: async (
    files: Array<{
      id: string;
      summary: string;
      tags: string[];
      category: string;
    }>,
  ): Promise<{
    success: boolean;
    message: string;
    results: Array<{
      stage_file_id: string;
      success: boolean;
      error?: string;
    }>;
    summary: {
      total: number;
      succeeded: number;
      failed: number;
    };
  }> => {
    try {
      const stageFileIds = files.map((f) => f.id);
      const fileMetadata: Record<
        string,
        { summary: string; tags: string[]; category: string }
      > = {};

      files.forEach((f) => {
        fileMetadata[f.id] = {
          summary: f.summary,
          tags: f.tags,
          category: f.category,
        };
      });

      const response = await callSupabaseFunction<{
        success: boolean;
        message: string;
        results: Array<{
          stage_file_id: string;
          success: boolean;
          error?: string;
        }>;
        summary: {
          total: number;
          succeeded: number;
          failed: number;
        };
      }>(
        'process-knowledge-base',
        {
          stage_file_ids: stageFileIds,
          file_metadata: fileMetadata,
        } as any,
        {
          timeout: 120000, // 2 minutes - knowledge base processing can take time
        },
      );
      return response;
    } catch (error) {
      console.error('Error bulk processing stage files:', error);
      throw error;
    }
  },

  /**
   * Bulk delete project files (stage files)
   * @param fileIds - Array of file IDs to delete
   */
  bulkDeleteProjectFiles: async (
    fileIds: string[],
  ): Promise<{
    success: boolean;
    message: string;
    total: number;
    success_count: number;
    failure_count: number;
    results: Array<{
      id: string;
      file_name: string;
      file_path: string;
      success: boolean;
      error?: string;
      storage_deletion_status: 'success' | 'failed';
    }>;
  }> => {
    try {
      const response = await callSupabaseFunction<{
        success: boolean;
        message: string;
        total: number;
        success_count: number;
        failure_count: number;
        results: Array<{
          id: string;
          file_name: string;
          file_path: string;
          success: boolean;
          error?: string;
          storage_deletion_status: 'success' | 'failed';
        }>;
      }>('delete-project-files', {
        file_ids: fileIds,
      } as any);
      return response;
    } catch (error) {
      console.error('Error bulk deleting project files:', error);
      throw error;
    }
  },

  /**
   * Copy a single mindspace file to a project stage
   * @param mindspaceFileId - UUID of the mindspace file to copy
   * @param projectStageId - UUID of the target project stage
   */
  copyMindspaceToStage: async (
    mindspaceFileId: string,
    projectStageId: string,
  ): Promise<{
    success: boolean;
    stage_file_id: string;
    message: string;
  }> => {
    try {
      const response = await callSupabaseFunction<{
        success: boolean;
        stage_file_id: string;
        message: string;
      }>(
        'copy-mindspace-to-stage',
        {
          mindspace_file_id: mindspaceFileId,
          project_stage_id: projectStageId,
        } as any,
        {
          timeout: 300000, // 5 minutes - file copy can take time
        },
      );
      return response;
    } catch (error) {
      console.error('Error copying mindspace file to stage:', error);
      throw error;
    }
  },

  /**
   * Bulk copy mindspace files to a project stage
   * @param mindspaceFileIds - Array of UUIDs of mindspace files to copy
   * @param projectStageId - UUID of the target project stage
   */
  bulkCopyMindspaceToStage: async (
    mindspaceFileIds: string[],
    projectStageId: string,
  ): Promise<{
    success: boolean;
    message: string;
    results: Array<{
      mindspace_file_id: string;
      stage_file_id?: string;
      success: boolean;
      error?: string;
    }>;
    summary: {
      total: number;
      succeeded: number;
      failed: number;
    };
  }> => {
    try {
      const response = await callSupabaseFunction<{
        success: boolean;
        message: string;
        results: Array<{
          mindspace_file_id: string;
          stage_file_id?: string;
          success: boolean;
          error?: string;
        }>;
        summary: {
          total: number;
          succeeded: number;
          failed: number;
        };
      }>(
        'copy-mindspace-to-stage',
        {
          mindspace_file_ids: mindspaceFileIds,
          project_stage_id: projectStageId,
        } as any,
        {
          timeout: 300000, // 5 minutes - bulk file copy can take time
        },
      );
      return response;
    } catch (error) {
      console.error('Error bulk copying mindspace files to stage:', error);
      throw error;
    }
  },

  /**
   * Fetch deliverables for a specific stage
   * @param workspaceId - Workspace ID
   * @param projectId - Project ID
   * @param projectStageId - Project Stage ID
   */
  getStageArtifacts: async (
    workspaceId: string,
    projectId: string,
    projectStageId: string,
  ): Promise<ProjectItem[]> => {
    try {
      const functionName = 'get-deliverables-v2';

      console.log(`[ProjectStageService] Calling ${functionName} with:`, {
        workspaceId,
        projectId,
        projectStageId,
      });

      const response = await callSupabaseFunction<EdgeFunctionResponse>(
        functionName,
        {
          workspace_id: workspaceId,
          project_id: projectId,
          stage_id: projectStageId,
        },
      );

      // Convert ISO strings to Date objects
      const items: ProjectItem[] = response.items.map((item) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        fileSize: item.fileSize,
        created_at: new Date(item.created_at),
        updated_at: new Date(item.updated_at),
        isDeliverable: item.isDeliverable,
        isKeyDeliverable: item.isKeyDeliverable,
      }));

      return items;
    } catch (error) {
      console.error('Error calling edge function:', error);
      return [];
    }
  },

  /**
   * Fetch files for a specific stage
   * @param projectStageId - Project Stage ID
   */
  getStageFiles: async (projectStageId: string): Promise<ProjectItem[]> => {
    try {
      const functionName = 'get-files-v2';

      console.log(`[ProjectStageService] Calling ${functionName} with:`, {
        projectStageId,
      });

      const filesResponse = await callSupabaseFunction<FilesResponse>(
        functionName,
        {
          project_stage_id: projectStageId,
        },
      );

      // Convert files response to standard format
      const items: ProjectItem[] = filesResponse.files.map((file) => ({
        id: file.id,
        title: file.file_name,
        description: `${(file.file_size / 1024).toFixed(1)} KB • ${
          file.mime_type
        }`,
        created_at: new Date(file.created_at),
        updated_at: new Date(file.created_at),
        keyDeliverable: file.file_in_project_context,
        file_size: file.file_size,
        mime_type: file.mime_type,
        mimeType: file.mime_type,
        signed_url: file.signed_url,
        createdInEditor: file.created_in_editor,
        isDeliverable: file.is_deliverable,
      }));

      return items;
    } catch (error) {
      console.error('Error calling get-files-v2 edge function:', error);
      return [];
    }
  },

  /**
   * Toggles the deliverable status of a file or list of files
   * @param id - Optional single file ID
   * @param ids - Optional list of file IDs
   */
  toggleDeliverable: async (
    id?: string,
    ids?: string[],
  ): Promise<{
    success: boolean;
    message?: string;
    updatedFiles?: Record<string, boolean>;
    error?: string;
  }> => {
    try {
      const response = await callSupabaseFunction<{
        success: boolean;
        message: string;
        updatedFiles: Record<string, boolean>;
        error?: string;
      }>('convert-to-deliverable', {
        id,
        ids,
      } as any);

      return response;
    } catch (error) {
      console.error('Error toggling deliverable status:', error);
      throw error;
    }
  },

  /**
   * Fetch all project assets without category filtering
   * @param projectId - Project ID
   */
  getProjectAssets: async (projectId: string): Promise<ProjectItem[]> => {
    try {
      const response = await callSupabaseFunction<FilesResponse>(
        'get-project-assets',
        {
          project_id: projectId,
        },
      );

      const items: ProjectItem[] = (response.files || []).map((file) => ({
        id: file.id,
        title: file.file_name,
        description: `${(file.file_size / 1024).toFixed(1)} KB • ${
          file.mime_type
        }`,
        created_at: new Date(file.created_at),
        updated_at: new Date(file.created_at),
        isKeyDeliverable: false,
        file_size: file.file_size,
        mime_type: file.mime_type,
        mimeType: file.mime_type,
        signed_url: file.signed_url,
        createdInEditor: file.created_in_editor,
        isDeliverable: file.is_deliverable,
      }));

      return items;
    } catch (error) {
      console.error('Error fetching project assets:', error);
      return [];
    }
  },

  /**
   * Toggles the key deliverable status of a file
   * @param id - File ID
   */
  toggleKeyDeliverable: async (
    id: string,
  ): Promise<{
    success: boolean;
    message?: string;
    updatedFiles?: Record<string, boolean>;
    error?: string;
  }> => {
    try {
      console.log(`[ProjectStageService] Toggling key deliverable for ${id}`);
      const response = await callSupabaseFunction<{
        success: boolean;
        message: string;
        updatedFiles: Record<string, boolean>;
        error?: string;
      }>('convert-to-key-deliverable', {
        id,
      } as any);

      return response;
    } catch (error) {
      console.error('Error toggling key deliverable status:', error);
      throw error;
    }
  },
};
