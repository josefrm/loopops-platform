import React from 'react';
import { MindspaceFile } from './MindspaceFile';
import { MindspaceDocument } from '@/models/MindspaceDocument';

interface MindspaceFileListProps {
  documents?: MindspaceDocument[];
  files?: any[]; // Keep for backward compatibility
  onDeleteDocument?: (id: string) => void;
}

export const MindspaceFileList: React.FC<MindspaceFileListProps> = ({
  documents,
  files,
  onDeleteDocument,
}) => {
  // Mock files for demonstration when no documents provided
  const mockFiles = [
    { fileName: 'Project_Requirements.pdf', fileType: 'pdf' },
    { fileName: 'Meeting_Notes_2025.docx', fileType: 'document' },
    { fileName: 'Budget_Analysis.xlsx', fileType: 'spreadsheet' },
  ];

  // Determine what to display
  const hasDocuments = documents && documents.length > 0;
  const hasFiles = files && files.length > 0;
  const filesToDisplay = hasFiles ? files : mockFiles;

  return (
    <div className="w-full overflow-visible">
      <div className="flex flex-col gap-loop-4 overflow-visible">
        {/* First: Display pending/uploaded documents at the top */}
        {hasDocuments &&
          documents.map((document) => (
            <MindspaceFile
              key={document.id}
              document={document}
              onDelete={onDeleteDocument}
            />
          ))}

        {/* Then: Display existing/mock files below */}
        {filesToDisplay.map((file, index) => (
          <MindspaceFile
            key={`mock-${index}`}
            fileName={file.fileName}
            fileType={file.fileType}
          />
        ))}
      </div>
    </div>
  );
};
