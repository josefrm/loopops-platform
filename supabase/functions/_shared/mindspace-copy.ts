import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { extractMetadata, processDocument } from './knowledge-base.ts';

// Result for a single file copy operation
export interface CopyFileResult {
  mindspace_file_id: string;
  success: boolean;
  stage_file_id?: string;
  error?: string;
}

/**
 * Copies a single file from Mindspace to the Project Stage bucket,
 * creates the database record, and processes it in the knowledge base.
 */
export async function copySingleFile(
  supabaseAdmin: ReturnType<typeof createClient>,
  mindspaceFileId: string,
  projectStageId: string,
  userId: string,
  targetWorkspaceId?: string | null,
  metadata?: { summary: string; tags: string[]; category: string },
): Promise<CopyFileResult> {
  try {
    // Step 1: Get the mindspace file and verify user owns it
    const { data: mindspaceFile, error: mindspaceError } = await supabaseAdmin
      .from('loopops_mindspace_files')
      .select(
        `
        id,
        file_path,
        file_name,
        file_size,
        mime_type,
        mindspace_bucket:loopops_mindspace_buckets!inner (
          id,
          bucket_name,
          user_id,
          workspace_id,
          project_id
        )
      `,
      )
      .eq('id', mindspaceFileId)
      .maybeSingle();

    if (mindspaceError) {
      console.error('Error querying mindspace file:', mindspaceError);
      return {
        mindspace_file_id: mindspaceFileId,
        success: false,
        error: 'Failed to query mindspace file',
      };
    }

    if (!mindspaceFile) {
      return {
        mindspace_file_id: mindspaceFileId,
        success: false,
        error: 'Mindspace file not found',
      };
    }

    // Verify user owns this mindspace file
    if (mindspaceFile.mindspace_bucket.user_id !== userId) {
      return {
        mindspace_file_id: mindspaceFileId,
        success: false,
        error: 'Forbidden: You do not have access to this mindspace file',
      };
    }

    console.log(
      `Found mindspace file: ${mindspaceFile.file_name} in bucket ${mindspaceFile.mindspace_bucket.bucket_name}`,
    );

    // Step 2: Verify user has access to the project stage
    const { data: stageAccess, error: accessError } = await supabaseAdmin
      .from('loopops_project_stages')
      .select(
        `
        id,
        project_id,
        projects:loopops_projects!inner (
          id,
          workspace_id,
          workspaces:loopops_workspaces!inner (
            id,
            owner_id
          )
        )
      `,
      )
      .eq('id', projectStageId)
      .maybeSingle();

    if (accessError) {
      console.error('Error checking stage access:', accessError);
      return {
        mindspace_file_id: mindspaceFileId,
        success: false,
        error: 'Failed to verify stage access permissions',
      };
    }

    if (!stageAccess || stageAccess.projects.workspaces.owner_id !== userId) {
      return {
        mindspace_file_id: mindspaceFileId,
        success: false,
        error: 'Forbidden: You do not have access to this project stage',
      };
    }

    // Step 3: Get or create stage bucket for this project stage
    const stageBucket = await supabaseAdmin
      .from('loopops_stage_buckets')
      .select('id, bucket_name, project_stage_id')
      .eq('project_stage_id', projectStageId)
      .maybeSingle();

    if (stageBucket.error && stageBucket.error.code !== 'PGRST116') {
      console.error('Error querying stage bucket:', stageBucket.error);
      return {
        mindspace_file_id: mindspaceFileId,
        success: false,
        error: 'Failed to query stage bucket',
      };
    }

    if (!stageBucket.data) {
      return {
        mindspace_file_id: mindspaceFileId,
        success: false,
        error:
          'Stage bucket not found. Please ensure the stage bucket is created first.',
      };
    }

    console.log(
      `Using stage bucket: ${stageBucket.data.bucket_name} (${stageBucket.data.id})`,
    );

    // Step 4: Check if this file has already been copied to this stage
    const { data: existingFile, error: existingError } = await supabaseAdmin
      .from('loopops_stage_files')
      .select('id')
      .eq('stage_bucket_id', stageBucket.data.id)
      .eq('mindspace_file_id', mindspaceFileId)
      .maybeSingle();

    if (existingError && existingError.code !== 'PGRST116') {
      console.error('Error checking existing file:', existingError);
      return {
        mindspace_file_id: mindspaceFileId,
        success: false,
        error: 'Failed to check for existing file',
      };
    }

    if (existingFile) {
      return {
        mindspace_file_id: mindspaceFileId,
        success: false,
        stage_file_id: existingFile.id,
        error: 'File already exists in this stage',
      };
    }

    // Step 5: Copy the physical file from mindspace bucket to stage bucket
    const sourceBucket = mindspaceFile.mindspace_bucket.bucket_name;
    const targetBucket = stageBucket.data.bucket_name;
    const sourceFilePath = mindspaceFile.file_path;

    // Generate a unique file path in the stage bucket to avoid conflicts
    const timestamp = Date.now();
    const targetFilePath = `${timestamp}-${mindspaceFile.file_name}`;

    console.log(
      `Copying file from ${sourceBucket}/${sourceFilePath} to ${targetBucket}/${targetFilePath}`,
    );

    // Download file from mindspace bucket
    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from(sourceBucket)
      .download(sourceFilePath);

    if (downloadError) {
      console.error(
        'Error downloading file from mindspace bucket:',
        downloadError,
      );
      return {
        mindspace_file_id: mindspaceFileId,
        success: false,
        error: `Failed to download file from mindspace: ${downloadError.message}`,
      };
    }

    // Upload file to stage bucket
    const { error: uploadError } = await supabaseAdmin.storage
      .from(targetBucket)
      .upload(targetFilePath, fileData, {
        contentType: mindspaceFile.mime_type || 'application/octet-stream',
        upsert: false,
      });

    if (uploadError) {
      console.error('Error uploading file to stage bucket:', uploadError);
      return {
        mindspace_file_id: mindspaceFileId,
        success: false,
        error: `Failed to upload file to stage: ${uploadError.message}`,
      };
    }

    console.log(`File successfully copied to stage bucket`);

    // Step 6 & 7: Insert record and call knowledge base API
    let newStageFile;

    try {
      // Insert into stage_files table
      const { data: insertData, error: insertError } = await supabaseAdmin
        .from('loopops_stage_files')
        .insert({
          id: crypto.randomUUID(),
          stage_bucket_id: stageBucket.data.id,
          file_path: targetFilePath,
          file_name: mindspaceFile.file_name,
          file_size: mindspaceFile.file_size,
          mime_type: mindspaceFile.mime_type,
          mindspace_file_id: mindspaceFileId,
          is_deliverable: true,
        })
        .select('id')
        .single();

      if (insertError) {
        throw new Error(
          `Failed to create stage file record: ${insertError.message}`,
        );
      }

      newStageFile = insertData;
      console.log(`Successfully created stage file record: ${newStageFile.id}`);

      // Call knowledge base API to vectorize the document (non-blocking)
      console.log('Setting up knowledge base for the copied file...');

      try {
        // Determine workspace ID: prefer explicitly passed ID, fallback to project's workspace
        const workspaceIdToUse =
          targetWorkspaceId || stageAccess.projects.workspaces.id;

        // Prepare metadata: use provided or extract
        let finalMetadata = metadata;

        if (!finalMetadata) {
          console.log('Extracting metadata...');
          const extracted = await extractMetadata({
            storage_key: targetFilePath,
            bucket_name: stageBucket.data.bucket_name,
            project_id: stageAccess.project_id,
            stage_id: projectStageId,
            workspace_id: workspaceIdToUse,
          });
          finalMetadata = {
            summary: extracted.summary,
            tags: extracted.tags,
            category: extracted.category,
          };
          console.log('Metadata extracted successfully:', finalMetadata);
        } else {
          console.log('Using provided metadata, skipping extraction.');
        }

        // Step 2: Process document with final metadata
        console.log('Processing document for knowledge base...');
        const kbResult = await processDocument({
          storage_key: targetFilePath,
          bucket_name: stageBucket.data.bucket_name,
          project_id: stageAccess.project_id,
          stage_id: projectStageId,
          workspace_id: workspaceIdToUse,
          summary: finalMetadata.summary,
          tags: finalMetadata.tags,
          category: finalMetadata.category,
        });

        console.log('Knowledge base setup successful:', kbResult.message);
      } catch (kbError) {
        console.warn(
          'Knowledge base setup failed, but file was copied successfully:',
          kbError,
        );
        // Don't fail the entire operation if knowledge base setup fails
      }

      return {
        mindspace_file_id: mindspaceFileId,
        success: true,
        stage_file_id: newStageFile.id,
      };
    } catch (error) {
      console.error('Error in database/API operations:', error);

      // Rollback: Clean up the uploaded file from storage
      try {
        console.log('Rolling back: removing uploaded file from storage...');
        await supabaseAdmin.storage.from(targetBucket).remove([targetFilePath]);
        console.log('Storage cleanup successful');
      } catch (cleanupError) {
        console.error('Error cleaning up uploaded file:', cleanupError);
      }

      return {
        mindspace_file_id: mindspaceFileId,
        success: false,
        error: error instanceof Error ? error.message : 'Operation failed',
      };
    }
  } catch (error) {
    console.error('Error copying file:', error);
    return {
      mindspace_file_id: mindspaceFileId,
      success: false,
      error:
        error instanceof Error ? error.message : 'An unexpected error occurred',
    };
  }
}
