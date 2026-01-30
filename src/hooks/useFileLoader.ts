import { useState, useCallback } from 'react';
import { MessageAttachment } from '@/models/Message';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspaceProjectStore } from '@/stores/workspaceProjectStore';
import { useAuth } from '@/contexts/AuthContext';
import {
  isImageFile,
  isPdfFile,
  isTextFile,
  isOfficeFile,
  generateFileInfoMarkdown,
  generateBinaryFileMarkdown,
  generateErrorMarkdown,
} from '@/utils/fileUtils';

interface FileContent {
  title: string;
  content: string;
  size: number;
  type: string;
}

export const useFileLoader = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currentWorkspaceId = useWorkspaceProjectStore((state) => state.currentWorkspaceId);
  const currentProjectId = useWorkspaceProjectStore((state) => state.currentProjectId);
  const { user } = useAuth();

  /**
   * Query database to find which bucket contains the file path
   * First tries to get user's mindspace bucket, then falls back to file lookup
   */
  const findBucketForFilePath = useCallback(
    async (filePath: string): Promise<string | null> => {
      console.log('🔍 Searching for bucket with file path:', filePath);
      console.log('Context - Workspace:', currentWorkspaceId, 'Project:', currentProjectId, 'User:', user?.id);
      
      try {
        // Strategy 1: Get user's mindspace bucket directly using user_id, workspace_id, and project_id
        if (currentWorkspaceId && currentProjectId && user?.id) {
          console.log('Querying mindspace buckets table...');
          const { data: mindspaceBucket, error: bucketError } = await supabase
            .from('loopops_mindspace_buckets')
            .select('bucket_name')
            .eq('user_id', user.id)
            .eq('workspace_id', currentWorkspaceId)
            .eq('project_id', currentProjectId)
            .maybeSingle();

          console.log('Mindspace bucket query result:', { data: mindspaceBucket, error: bucketError });

          if (!bucketError && mindspaceBucket?.bucket_name) {
            console.log(`✅ Found user's mindspace bucket: ${mindspaceBucket.bucket_name}`);
            return mindspaceBucket.bucket_name;
          } else if (bucketError) {
            console.warn('Mindspace bucket query error:', bucketError);
          }
        } else {
          console.log('Skipping mindspace bucket query - missing context:', {
            hasWorkspace: !!currentWorkspaceId,
            hasProject: !!currentProjectId,
            hasUser: !!user?.id,
          });
        }

        // Strategy 2: Try to find the file in mindspace files table
        if (currentWorkspaceId && currentProjectId && user?.id) {
          console.log('Querying mindspace files table...');
          const { data: mindspaceFile, error: mindspaceError } = await supabase
            .from('loopops_mindspace_files')
            .select('loopops_mindspace_buckets(bucket_name), file_path')
            .eq('file_path', filePath)
            .maybeSingle();

          console.log('Mindspace file query result:', { data: mindspaceFile, error: mindspaceError });

          if (!mindspaceError && mindspaceFile) {
            const bucketName = (mindspaceFile as any).loopops_mindspace_buckets?.bucket_name;
            if (bucketName) {
              console.log(`✅ Found bucket in mindspace files: ${bucketName}`);
              return bucketName;
            }
          }
        }

        // Strategy 3: Try to find in project files
        if (currentProjectId) {
          console.log('Querying project files table...');
          const { data: projectFile, error: projectError } = await supabase
            .from('loopops_project_files')
            .select('loopops_project_buckets(bucket_name), file_path')
            .eq('file_path', filePath)
            .maybeSingle();

          console.log('Project files query result:', { data: projectFile, error: projectError });

          if (!projectError && projectFile) {
            const bucketName = (projectFile as any).loopops_project_buckets?.bucket_name;
            if (bucketName) {
              console.log(`✅ Found bucket in project files: ${bucketName}`);
              return bucketName;
            }
          }
        }

        // Strategy 4: Try to find in stage files
        console.log('Querying stage files table...');
        const { data: stageFile, error: stageError } = await supabase
          .from('loopops_stage_files')
          .select('loopops_stage_buckets(bucket_name), file_path')
          .eq('file_path', filePath)
          .maybeSingle();

        console.log('Stage files query result:', { data: stageFile, error: stageError });

        if (!stageError && stageFile) {
          const bucketName = (stageFile as any).loopops_stage_buckets?.bucket_name;
          if (bucketName) {
            console.log(`✅ Found bucket in stage files: ${bucketName}`);
            return bucketName;
          }
        }

        console.log('❌ No bucket found in database for file path:', filePath);
        return null;
      } catch (err) {
        console.error('Error finding bucket for file path:', err);
        return null;
      }
    },
    [currentWorkspaceId, currentProjectId, user?.id],
  );

  const loadFileContent = useCallback(
    async (attachment: MessageAttachment): Promise<FileContent | null> => {
      // If we have a local File object, read it directly
      if (attachment.file) {
        setLoading(true);
        setError(null);
        
        try {
          const file = attachment.file;
          
          if (isImageFile(file.type, file.name)) {
            const url = URL.createObjectURL(file);
            return {
              title: file.name,
              content: url,
              size: file.size,
              type: file.type,
            };
          }
          
          if (isTextFile(file.type, file.name)) {
            const text = await file.text();
            return {
              title: file.name,
              content: text,
              size: file.size,
              type: file.type,
            };
          }
          
          if (isPdfFile(file.type, file.name)) {
            const url = URL.createObjectURL(file);
            return {
              title: file.name,
              content: url,
              size: file.size,
              type: file.type,
            };
          }
          
          if (isOfficeFile(file.type, file.name)) {
            const arrayBuffer = await file.arrayBuffer();
            const bytes = new Uint8Array(arrayBuffer);
            let binary = '';
            for (let i = 0; i < bytes.byteLength; i++) {
              binary += String.fromCharCode(bytes[i]);
            }
            const base64 = btoa(binary);
            const dataUrl = `data:${file.type};base64,${base64}`;
            
            return {
              title: file.name,
              content: dataUrl,
              size: file.size,
              type: file.type,
            };
          }
          
          return {
            title: file.name,
            content: generateFileInfoMarkdown(file.name, file.size, file.type),
            size: file.size,
            type: file.type,
          };
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Unknown error';
          setError(errorMessage);
          return {
            title: attachment.name,
            content: generateErrorMarkdown(attachment.name, errorMessage),
            size: attachment.size,
            type: attachment.type,
          };
        } finally {
          setLoading(false);
        }
      }
      
      // If no URL, return error message
      if (!attachment.url || attachment.url.trim() === '') {
        console.warn('Attachment has no URL:', attachment);
        return {
          title: attachment.name,
          content: generateFileInfoMarkdown(
            attachment.name,
            attachment.size,
            attachment.type,
          ),
          size: attachment.size,
          type: attachment.type,
        };
      }

      const isDataUrl = attachment.url.startsWith('data:');
      const isHttpUrl = attachment.url.startsWith('http') || attachment.url.startsWith('https') || attachment.url.startsWith('blob:');
      // Treat as bucket path if it's not a data URL and not an HTTP/HTTPS URL
      // Bucket paths can be "bucket-name/path/to/file" or just "path/to/file"
      const isBucketPath = !isDataUrl && !isHttpUrl;
      
      // Handle bucket paths - download from storage
      if (isBucketPath) {
        setLoading(true);
        setError(null);
        
        try {
          // Check if supabase is available
          if (!supabase || !supabase.storage) {
            throw new Error('Storage service not available');
          }
          
          console.log('Attempting to download from bucket path:', attachment.url);
          
          // Parse bucket path - format could be "bucket-name/path/to/file" or just "path/to/file"
          const pathParts = attachment.url.split('/');
          let bucketName: string | null = null;
          let filePath: string = attachment.url;
          
          // Strategy 1: Query database to find the bucket for this file path
          bucketName = await findBucketForFilePath(attachment.url);
          console.log('Bucket name from database query:', bucketName);
          
          // Strategy 2: If not found in DB, try parsing the path
          // Check if first part might be a bucket name
          if (!bucketName && pathParts.length > 1) {
            const firstPart = pathParts[0];
            console.log('Trying to parse bucket from path, first part:', firstPart);
            
            // Check if first part matches known bucket patterns
            const isKnownBucketPattern = 
              firstPart.includes('mindspace') || 
              firstPart.includes('project') || 
              firstPart.includes('stage') ||
              firstPart.includes('workspace') ||
              firstPart.startsWith('ms-'); // Mindspace bucket format: ms-{workspace}-{project}-{user}
            
            if (isKnownBucketPattern) {
              bucketName = firstPart;
              filePath = pathParts.slice(1).join('/');
              console.log(`Parsed bucket name: ${bucketName}, file path: ${filePath}`);
            } else {
              // Try the first part as a bucket name anyway (e.g., "generated-by-ai")
              filePath = pathParts.slice(1).join('/');
              console.log(`Trying first part as bucket: ${firstPart}, file path: ${filePath}`);
            }
          }
          
          // Try to download from storage
          let blob: Blob | null = null;
          let lastError: any = null;
          
          // Strategy 3: Try with bucket name from DB or parsed
          if (bucketName) {
            console.log(`Attempting download - Bucket: ${bucketName}, File Path: ${filePath}`);
            const { data, error: err } = await supabase.storage
              .from(bucketName)
              .download(filePath);
            if (!err && data) {
              blob = data;
              console.log(`✅ Successfully downloaded from bucket "${bucketName}" with path "${filePath}"`);
            } else if (err) {
              lastError = err;
              console.warn(`❌ Failed to download from bucket "${bucketName}" with path "${filePath}":`, err);
            }
          }
          
          // Strategy 4: If that failed, try common bucket names with the full path
          if (!blob) {
            const commonBuckets = ['stage-files', 'project-files', 'mindspace-files'];
            for (const bucket of commonBuckets) {
              const { data, error: err } = await supabase.storage
                .from(bucket)
                .download(attachment.url); // Try full path
              if (!err && data) {
                blob = data;
                bucketName = bucket;
                console.log(`Successfully downloaded from bucket ${bucket} with full path`);
                break;
              } else if (err) {
                lastError = err;
                console.warn(`Failed to download from bucket ${bucket} with full path:`, err);
              }
            }
          }
          
          // Strategy 5: Try common buckets with just the file path (without first part)
          if (!blob && pathParts.length > 1) {
            const filePathOnly = pathParts.slice(1).join('/');
            const commonBuckets = ['stage-files', 'project-files', 'mindspace-files'];
            for (const bucket of commonBuckets) {
              const { data, error: err } = await supabase.storage
                .from(bucket)
                .download(filePathOnly);
              if (!err && data) {
                blob = data;
                bucketName = bucket;
                console.log(`Successfully downloaded from bucket ${bucket} with path ${filePathOnly}`);
                break;
              } else if (err) {
                lastError = err;
                console.warn(`Failed to download from bucket ${bucket} with path ${filePathOnly}:`, err);
              }
            }
          }
          
          if (!blob) {
            const errorMsg = lastError?.message || 'File not found in any bucket';
            console.error('Failed to download file from storage:', {
              url: attachment.url,
              filePath,
              bucketName,
              error: lastError,
            });
            throw new Error(`Failed to download file from storage: ${errorMsg}`);
          }
          
          // Handle different file types
          const fileName = attachment.file_name || attachment.name || 'file';
          const mimeType = attachment.type || blob.type || 'application/octet-stream';
          
          if (isImageFile(mimeType, fileName)) {
            const url = URL.createObjectURL(blob);
            return {
              title: fileName,
              content: url,
              size: blob.size,
              type: mimeType,
            };
          }
          
          if (isPdfFile(mimeType, fileName)) {
            const url = URL.createObjectURL(blob);
            return {
              title: fileName,
              content: url,
              size: blob.size,
              type: mimeType,
            };
          }
          
          if (isOfficeFile(mimeType, fileName)) {
            const arrayBuffer = await blob.arrayBuffer();
            const bytes = new Uint8Array(arrayBuffer);
            let binary = '';
            for (let i = 0; i < bytes.byteLength; i++) {
              binary += String.fromCharCode(bytes[i]);
            }
            const base64 = btoa(binary);
            const dataUrl = `data:${mimeType};base64,${base64}`;
            
            return {
              title: fileName,
              content: dataUrl,
              size: blob.size,
              type: mimeType,
            };
          }
          
          if (isTextFile(mimeType, fileName)) {
            const text = await blob.text();
            return {
              title: fileName,
              content: text,
              size: blob.size,
              type: mimeType,
            };
          }
          
          return {
            title: fileName,
            content: generateBinaryFileMarkdown(fileName, blob.size, mimeType),
            size: blob.size,
            type: mimeType,
          };
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Unknown error';
          setError(errorMessage);
          return {
            title: attachment.name,
            content: generateErrorMarkdown(attachment.name, errorMessage),
            size: attachment.size,
            type: attachment.type,
          };
        } finally {
          setLoading(false);
        }
      }
      
      if (isDataUrl) {
        if (isImageFile(attachment.type, attachment.name)) {
          return {
            title: attachment.name,
            content: attachment.url,
            size: attachment.size,
            type: attachment.type,
          };
        }
        
        if (isPdfFile(attachment.type, attachment.name)) {
          return {
            title: attachment.name,
            content: attachment.url,
            size: attachment.size,
            type: attachment.type,
          };
        }
        
        if (isOfficeFile(attachment.type, attachment.name)) {
          return {
            title: attachment.name,
            content: attachment.url,
            size: attachment.size,
            type: attachment.type,
          };
        }
        
        if (isTextFile(attachment.type, attachment.name)) {
          try {
            if (attachment.url.includes(';base64,')) {
              const base64Data = attachment.url.split(',')[1];
              const text = atob(base64Data);
              return {
                title: attachment.name,
                content: text,
                size: attachment.size,
                type: attachment.type,
              };
            } else {
              const urlEncodedData = attachment.url.split(',')[1];
              const text = decodeURIComponent(urlEncodedData);
              return {
                title: attachment.name,
                content: text,
                size: attachment.size,
                type: attachment.type,
              };
            }
          } catch (err) {
            console.error('Error decoding text data URL:', err);
          }
        }
      }

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(attachment.url);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const contentType = response.headers.get('content-type') || '';

        if (isImageFile(contentType, attachment.name)) {
          return {
            title: attachment.name,
            content: attachment.url,
            size: attachment.size,
            type: attachment.type,
          };
        }

        if (isPdfFile(contentType, attachment.name)) {
          return {
            title: attachment.name,
            content: attachment.url,
            size: attachment.size,
            type: attachment.type,
          };
        }

        if (isOfficeFile(contentType, attachment.name)) {
          return {
            title: attachment.name,
            content: attachment.url,
            size: attachment.size,
            type: attachment.type,
          };
        }

        if (isTextFile(contentType, attachment.name)) {
          const text = await response.text();
          return {
            title: attachment.name,
            content: text,
            size: attachment.size,
            type: attachment.type,
          };
        }

        return {
          title: attachment.name,
          content: generateBinaryFileMarkdown(
            attachment.name,
            attachment.size,
            attachment.type,
          ),
          size: attachment.size,
          type: attachment.type,
        };
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);

        return {
          title: attachment.name,
          content: generateErrorMarkdown(attachment.name, errorMessage),
          size: attachment.size,
          type: attachment.type,
        };
      } finally {
        setLoading(false);
      }
    },
    [findBucketForFilePath],
  );

  return {
    loadFileContent,
    loading,
    error,
  };
};
