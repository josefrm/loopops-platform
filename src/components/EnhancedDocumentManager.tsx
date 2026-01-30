import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspaceProjectStore } from '@/stores/workspaceProjectStore';
import {
  SYSTEM_MAX_FILE_SIZE_BYTES,
  SYSTEM_MAX_FILE_SIZE_MB,
} from '@/utils/fileUploadValidation';
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Database,
  File,
  Search,
  Trash2,
  Upload,
} from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';

interface DocumentMetadata {
  id: string;
  document_id: string;
  workspace_id: string;
  document_type: string;
  title: string;
  status: string; // Changed from union type to string
  total_chunks?: number;
  file_path?: string;
  file_size?: number;
  mime_type?: string;
  extraction_method?: string;
  processing_started_at?: string;
  processing_completed_at?: string;
  created_at: string;
  updated_at: string;
}

interface ProcessingStatus {
  document_id: string;
  status: 'uploading' | 'processing' | 'completed' | 'failed';
  progress: number;
  message: string;
}

const SUPPORTED_FILE_TYPES = {
  'application/pdf': { icon: '📄', label: 'PDF' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
    icon: '📝',
    label: 'DOCX',
  },
  'application/msword': { icon: '📝', label: 'DOC' },
  'text/plain': { icon: '📄', label: 'TXT' },
  'text/markdown': { icon: '📝', label: 'MD' },
  'text/csv': { icon: '📊', label: 'CSV' },
  'application/json': { icon: '🔧', label: 'JSON' },
};

export const EnhancedDocumentManager: React.FC = () => {
  const currentWorkspace = useWorkspaceProjectStore((state) =>
    state.getCurrentWorkspace(),
  );
  const { toast } = useToast();
  const [documents, setDocuments] = useState<DocumentMetadata[]>([]);
  const [processingStatus, setProcessingStatus] = useState<
    Map<string, ProcessingStatus>
  >(new Map());
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  // Load documents from database
  const loadDocuments = useCallback(async () => {
    if (!currentWorkspace) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('knowledge_metadata')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error loading documents:', error);
      toast({
        title: 'Error',
        description: 'Failed to load documents',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace, toast]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  // Create workspace-specific storage bucket
  const ensureStorageBucket = async (workspaceId: string) => {
    const bucketName = `workspace-${workspaceId}-documents`;

    try {
      // Check if bucket exists
      const { data: buckets } = await supabase.storage.listBuckets();
      const bucketExists = buckets?.some((bucket) => bucket.id === bucketName);

      if (!bucketExists) {
        const { error } = await supabase.storage.createBucket(bucketName, {
          public: false,
          allowedMimeTypes: Object.keys(SUPPORTED_FILE_TYPES),
          fileSizeLimit: SYSTEM_MAX_FILE_SIZE_BYTES,
        });

        if (error) throw error;
      }

      return bucketName;
    } catch (error) {
      console.error('Error ensuring storage bucket:', error);
      throw error;
    }
  };

  // Handle file upload and processing pipeline
  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file || !currentWorkspace) return;

    // Validate file type
    if (!Object.keys(SUPPORTED_FILE_TYPES).includes(file.type)) {
      toast({
        title: 'Unsupported File Type',
        description: 'Please upload PDF, DOCX, TXT, MD, CSV, or JSON files',
        variant: 'destructive',
      });
      return;
    }

    const documentId = `doc-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    const documentType = getDocumentType(file.name);

    // Initialize processing status
    setProcessingStatus(
      (prev) =>
        new Map(
          prev.set(documentId, {
            document_id: documentId,
            status: 'uploading',
            progress: 0,
            message: 'Preparing upload...',
          }),
        ),
    );

    try {
      // Step 1: Create storage bucket if needed
      updateProcessingStatus(
        documentId,
        'uploading',
        10,
        'Creating storage bucket...',
      );
      const bucketName = await ensureStorageBucket(currentWorkspace.id);

      // Step 2: Upload file to storage
      updateProcessingStatus(documentId, 'uploading', 30, 'Uploading file...');
      const filePath = `${documentId}/${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Step 3: Create metadata entry
      updateProcessingStatus(
        documentId,
        'processing',
        70,
        'Creating metadata entry...',
      );
      const { error: metadataError } = await supabase
        .from('knowledge_metadata')
        .insert({
          document_id: documentId,
          workspace_id: currentWorkspace.id,
          document_type: documentType,
          title: file.name,
          status: 'uploaded',
          file_path: filePath,
          file_size: file.size,
          mime_type: file.type,
          extraction_method: 'file_reader',
        });

      if (metadataError) throw metadataError;

      // Step 4: Complete
      updateProcessingStatus(documentId, 'completed', 100, 'Upload complete!');

      toast({
        title: 'Success',
        description: `Document "${file.name}" uploaded successfully`,
      });

      // Reload documents
      await loadDocuments();

      // Clear processing status after a delay to show completion
      setTimeout(() => {
        setProcessingStatus((prev) => {
          const newMap = new Map(prev);
          newMap.delete(documentId);
          return newMap;
        });
      }, 2000);
    } catch (error) {
      console.error('Error processing document:', error);
      updateProcessingStatus(
        documentId,
        'failed',
        0,
        `Error: ${error.message}`,
      );

      toast({
        title: 'Processing Failed',
        description: error.message || 'Failed to process document',
        variant: 'destructive',
      });
    }

    // Clear the file input
    event.target.value = '';
  };

  // Update processing status
  const updateProcessingStatus = (
    documentId: string,
    status: ProcessingStatus['status'],
    progress: number,
    message: string,
  ) => {
    setProcessingStatus(
      (prev) =>
        new Map(
          prev.set(documentId, {
            document_id: documentId,
            status,
            progress,
            message,
          }),
        ),
    );
  };

  // Get document type from filename
  const getDocumentType = (filename: string): string => {
    const extension = filename.split('.').pop()?.toLowerCase();
    const typeMap: Record<string, string> = {
      pdf: 'document',
      docx: 'document',
      doc: 'document',
      txt: 'text',
      md: 'documentation',
      csv: 'data',
      json: 'configuration',
    };
    return typeMap[extension || ''] || 'document';
  };

  // Delete document
  const handleDeleteDocument = async (document: DocumentMetadata) => {
    if (!currentWorkspace) return;

    try {
      // Delete from knowledge base
      const { error: deleteError } = await supabase
        .from('knowledge_metadata')
        .delete()
        .eq('document_id', document.document_id)
        .eq('workspace_id', currentWorkspace.id);

      if (deleteError) throw deleteError;

      // Delete from storage if file path exists
      if (document.file_path) {
        const bucketName = `workspace-${currentWorkspace.id}-documents`;
        await supabase.storage.from(bucketName).remove([document.file_path]);
      }

      toast({
        title: 'Success',
        description: 'Document deleted successfully',
      });

      await loadDocuments();
    } catch (error) {
      console.error('Error deleting document:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete document',
        variant: 'destructive',
      });
    }
  };

  // Filter documents
  const filteredDocuments = documents.filter(
    (doc) =>
      doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.document_type.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-success" />;
      case 'processing':
        return <Clock className="w-4 h-4 text-warning animate-spin" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-destructive" />;
      default:
        return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  // Get file type info
  const getFileTypeInfo = (mimeType?: string) => {
    if (!mimeType) return { icon: '📄', label: 'Unknown' };
    return SUPPORTED_FILE_TYPES[mimeType] || { icon: '📄', label: 'Unknown' };
  };

  if (!currentWorkspace) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        Please select a workspace to manage documents.
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center space-x-3 mb-4">
        <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
          <Database className="w-4 h-4 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-bold">Knowledge Base</h2>
          <p className="text-sm text-muted-foreground">
            Workspace: {currentWorkspace.name} • Upload & process documents for
            AI knowledge
          </p>
        </div>
      </div>

      {/* Upload Section */}
      <Card className="border-dashed border-2">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center space-x-2">
            <Upload className="w-4 h-4" />
            <span>Upload Document</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <div>
            <Label htmlFor="file-upload" className="text-sm">
              Select File
            </Label>
            <Input
              id="file-upload"
              type="file"
              accept=".txt,.md,.pdf,.doc,.docx,.csv,.json"
              onChange={handleFileUpload}
              className="h-8"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Supported: PDF, DOCX, TXT, MD, CSV, JSON (Max{' '}
              {SYSTEM_MAX_FILE_SIZE_MB}MB)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Processing Status */}
      {processingStatus.size > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Processing Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {Array.from(processingStatus.values()).map((status) => (
              <div key={status.document_id} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>{status.message}</span>
                  <span className="text-muted-foreground">
                    {status.progress}%
                  </span>
                </div>
                <Progress value={status.progress} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <div className="flex items-center space-x-2">
        <Search className="w-4 h-4 text-muted-foreground" />
        <Input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search documents..."
          className="flex-1 h-8"
        />
      </div>

      {/* Documents List */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">
            Loading documents...
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {searchTerm
              ? 'No documents match your search.'
              : 'No documents uploaded yet.'}
          </div>
        ) : (
          filteredDocuments.map((doc) => {
            const fileInfo = getFileTypeInfo(doc.mime_type || undefined);
            return (
              <Card key={doc.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <File className="w-3 h-3 text-muted-foreground" />
                        <h3 className="font-medium text-sm">{doc.title}</h3>
                        <Badge variant="outline" className="text-xs">
                          {fileInfo.icon} {fileInfo.label}
                        </Badge>
                        <Badge
                          variant={
                            doc.status === 'completed'
                              ? 'default'
                              : doc.status === 'processing'
                              ? 'secondary'
                              : 'destructive'
                          }
                          className="text-xs"
                        >
                          {getStatusIcon(doc.status)}
                          {doc.status}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground mb-2">
                        <div>Type: {doc.document_type}</div>
                        <div>Chunks: {doc.total_chunks || 0}</div>
                        {doc.file_size && (
                          <div>
                            Size: {(doc.file_size / 1024).toFixed(1)} KB
                          </div>
                        )}
                        <div>
                          Created:{' '}
                          {new Date(doc.created_at).toLocaleDateString()}
                        </div>
                      </div>

                      {doc.processing_started_at &&
                        doc.processing_completed_at && (
                          <div className="text-xs text-muted-foreground">
                            Processed in{' '}
                            {Math.round(
                              (new Date(doc.processing_completed_at).getTime() -
                                new Date(doc.processing_started_at).getTime()) /
                                1000,
                            )}
                            s
                          </div>
                        )}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteDocument(doc)}
                      className="text-destructive hover:text-destructive h-6 w-6 p-0"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};
