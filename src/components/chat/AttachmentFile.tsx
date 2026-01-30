import React from 'react';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { FileTypeIcon } from '@/components/ui/FileTypeIcon';
import { MessageAttachment } from '@/models/Message';
import { useFileLoader } from '@/hooks/useFileLoader';
import { useNavigate } from 'react-router-dom';

interface AttachmentFileProps {
  file: MessageAttachment;
  onDocumentClick: (title: string, content: string) => void;
}

export const AttachmentFile: React.FC<AttachmentFileProps> = ({ 
  file, 
  onDocumentClick 
}) => {
  const { loadFileContent, loading } = useFileLoader();
  const navigate = useNavigate();

  const handleClick = async () => {
    if (loading) return;
    
    // If we have a file_id, navigate to mindspace
    if (file.file_id) {
      navigate(`/mindspace?fileId=${file.file_id}`);
      return;
    }
    
    // Otherwise, load the file content and open in DocumentViewer
    // This will handle bucket paths, URLs, data URLs, etc.
    const result = await loadFileContent(file);
    if (result) {
      onDocumentClick(result.title, result.content);
    }
  };

  const displayName = file.file_name || file.name;

  return (
    <Card
      variant="attachment-file"
      className="flex flex-row items-center gap-loop-1 p-loop-3 cursor-pointer hover:shadow-lg transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
      onClick={handleClick}
    >
      {loading ? (
        <div className="flex items-center justify-center w-loop-6 h-loop-6">
          <Loader2 className="h-4 w-4 text-brand-accent-50 animate-spin" />
        </div>
      ) : (
        <FileTypeIcon fileName={displayName} size={24} />
      )}
      <span className="text-sm text-neutral-grayscale-50 max-w-[80px] truncate ml-loop-1">
        {displayName}
      </span>
    </Card>
  );
};
