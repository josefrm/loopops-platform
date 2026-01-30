import { cn } from '@/lib/utils';
import { Copy, Download, X } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { CircleControlIcon } from '../ui/CircleControlIcon';
import { ControlButton } from '../ui/ControlButton';
import { LoopOpsIcon } from '../ui/icons/LoopOpsIcon';
import { useToast } from '../ui/use-toast';
import { getFileRenderer } from './document-viewer/fileRenderers';

interface DocumentPage {
  id: string;
  content: string;
  pageNumber: number;
  isKey?: boolean;
}

interface DocumentViewerProps {
  isOpen: boolean;
  onClose: () => void;
  documentTitle: string;
  documentContent: string;
  pages?: DocumentPage[];
  onEditInMindspace?: () => void;
  onDownload?: () => void;
  onStartLoop?: () => void;
}

export const DocumentViewer: React.FC<DocumentViewerProps> = ({
  isOpen,
  onClose,
  documentTitle,
  documentContent,
  onEditInMindspace,
  onDownload,
  onStartLoop,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      setIsExpanded(false);
      setTimeout(() => setIsExpanded(true), 50);
    } else {
      setIsExpanded(false);
    }
  }, [isOpen]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(documentContent);
    toast({
      title: 'Copied to clipboard',
      description: 'Document content copied to clipboard',
    });
  };

  const handleExport = () => {
    if (onDownload) {
      onDownload();
      return;
    }
    // Check if documentContent is likely a URL (simple check)
    const isUrl =
      documentContent.startsWith('http') ||
      documentContent.startsWith('blob:') ||
      documentContent.startsWith('/');

    if (isUrl) {
      const a = document.createElement('a');
      a.href = documentContent;
      a.download = documentTitle;
      a.target = '_blank';
      a.click();
      return;
    }

    const blob = new Blob([documentContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${documentTitle.replace(/[^a-z0-9.-]/gi, '_')}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const RenderedContent = useMemo(() => {
    const renderer = getFileRenderer(documentTitle, documentContent);
    return () => <>{renderer.render(documentContent, documentTitle)}</>;
  }, [documentTitle, documentContent]);

  if (!isOpen) return null;

  return (
    <div
      className={cn(
        'absolute inset-0 bg-gradient-to-br from-cyan-50 to-blue-50 z-50 transition-all duration-500 ease-in-out',
        isExpanded ? 'opacity-100 scale-100' : 'opacity-0 scale-95',
      )}
    >
      <div className="flex h-full w-full gap-loop-2">
        <div className="flex-1 bg-neutral-grayscale-10 p-loop-6 overflow-hidden">
          <div className="flex flex-col h-full gap-loop-12">
            <div className="flex items-center justify-between w-full flex-shrink-0 rounded-md bg-neutral-grayscale-0 py-loop-1 px-loop-4 h-loop-10 shadow-sm">
              {/* Left side empty for now or title if needed */}
              <div className="flex items-center"></div>

              {/* Right side actions */}
              <div className="flex items-center space-x-loop-1">
                <CircleControlIcon
                  type="gray"
                  size="sm"
                  icon={<Download />}
                  label="Export"
                  onClick={handleExport}
                  className="hover:z-[10000] relative"
                />
                {handleCopy && (
                  <CircleControlIcon
                    type="gray"
                    size="sm"
                    icon={<Copy size={24} fill="currentColor" />}
                    label="Copy"
                    onClick={handleCopy}
                    className="hover:z-[10000] relative"
                  />
                )}

                <CircleControlIcon
                  type="gray"
                  size="sm"
                  icon={<LoopOpsIcon />}
                  label="Loop"
                  onClick={onStartLoop}
                  className="hover:z-[10000] relative"
                />

                {onEditInMindspace && (
                  <ControlButton
                    text="Edit in Mindspace"
                    onClick={onEditInMindspace}
                    type="default"
                    size="xl"
                    className="text-sm"
                  />
                )}

                <button
                  onClick={onClose}
                  className="flex items-center justify-center text-neutral-grayscale-60 transition-colors duration-200 hover:text-brand-accent-50 w-loop-8 h-loop-8"
                  aria-label="Close editor"
                >
                  <X size={20} fill="currentColor" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto scrollbar-thin scrollbar-thumb-neutral-grayscale-30 scrollbar-track-transparent">
              <div className="max-w-[1200px] mx-auto px-loop-8">
                <div className="bg-white rounded-lg shadow-sm p-loop-8">
                  <h1 className="text-base font-bold text-neutral-grayscale-100 mb-loop-6 tracking-tight border-b pb-loop-4">
                    {documentTitle}
                  </h1>

                  <RenderedContent />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
