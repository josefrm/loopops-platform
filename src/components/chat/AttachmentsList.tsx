import { MessageAttachment } from '@/models/Message';
import React from 'react';
import { AttachmentFile } from './AttachmentFile';

interface AttachmentsListProps {
  attachments: MessageAttachment[];
  onDocumentClick: (title: string, content: string) => void;
}

export const AttachmentsList: React.FC<AttachmentsListProps> = ({
  attachments,
  onDocumentClick,
}) => {
  if (!attachments || attachments.length === 0) {
    return null;
  }

  return (
    <div className="flex gap-loop-3 flex-wrap justify-end">
      {attachments.map((file, index) => (
        <AttachmentFile
          key={`${file.id}-${index}`}
          file={file}
          onDocumentClick={onDocumentClick}
        />
      ))}
    </div>
  );
};
