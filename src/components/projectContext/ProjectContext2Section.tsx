import { ControlButton } from '@/components/ui/ControlButton';
import { LoopOpsIcon } from '@/components/ui/icons/LoopOpsIcon';
import { DownloadCloud, Trash2 } from 'lucide-react';
import React from 'react';

export interface ProjectContextContent {
  emoji?: string | null;
  title: string;
  description: string;
  description2?: string | null;
  buttonText: string;
}

interface ProjectContext2SectionProps {
  data: ProjectContextContent;
  buttonAction: () => void;
  isLoading?: boolean;
  // Legacy props for backward compatibility
  onCreateContext?: () => void;

  // Bulk Actions
  selectedFilesCount?: number;
  onDownloadSelected?: () => void;
  onDeleteSelected?: () => void;
  onStartLoop?: () => void;
  onClearSelection?: () => void;
  isBulkDownloading?: boolean;
  isBulkDeleting?: boolean;
}

export const ProjectContext2Section = React.forwardRef<
  HTMLDivElement,
  ProjectContext2SectionProps
>(
  (
    {
      data,
      buttonAction,
      isLoading = false,
      // Legacy props for backward compatibility
      onCreateContext,
      // Bulk Actions
      selectedFilesCount = 0,
      onDownloadSelected,
      onDeleteSelected,
      onStartLoop,
      isBulkDownloading = false,
      isBulkDeleting = false,
    },
    ref,
  ) => {
    // Handle backward compatibility
    const handleButtonClick = () => {
      if (buttonAction) {
        buttonAction();
      } else if (onCreateContext) {
        onCreateContext();
      }
    };

    const { emoji = '🎉', title, description, description2, buttonText } = data;

    // AI Thinking State
    const [isThinking, setIsThinking] = React.useState(false);
    const wasInBulkModeRef = React.useRef(selectedFilesCount > 0);

    React.useEffect(() => {
      const isInBulkMode = selectedFilesCount > 0;
      // Trigger thinking state only when going from 0 to some selected files
      if (isInBulkMode && !wasInBulkModeRef.current) {
        setIsThinking(true);
      }
      // Update ref
      wasInBulkModeRef.current = isInBulkMode;
    }, [selectedFilesCount]);

    React.useEffect(() => {
      if (isThinking) {
        const timer = setTimeout(() => {
          setIsThinking(false);
        }, 800);
        return () => clearTimeout(timer);
      }
    }, [isThinking]);

    return (
      <div
        className="flex-1 flex flex-shrink-0 items-center justify-center bg-brand-deliverable-20"
        style={{
          width: '40%',
          padding: '56px',
        }}
        data-testid="project-context-welcome-section"
      >
        {/* Centered div (460px x 190px) */}
        <div ref={ref} className="flex items-center justify-center h-fit">
          {/* Two column layout with emoji fitting content width */}
          <div className="flex gap-loop-6 w-full h-full items-start">
            {/* Left column: Emoji - fits content width, positioned at top */}
            {selectedFilesCount === 0 && emoji && (
              <div className="flex justify-center flex-shrink-0">
                <span className="text-[70px]">{emoji}</span>
              </div>
            )}
            {selectedFilesCount > 0 && (
              <div className="flex justify-center flex-shrink-0">
                <span
                  className={`text-[70px] ${isThinking ? 'animate-pulse' : ''}`}
                >
                  {isThinking ? '🧠' : '📥'}
                </span>
              </div>
            )}

            {/* Right column: Content - takes remaining space */}
            <div className="flex flex-col justify-center space-y-loop-4">
              {selectedFilesCount > 0 ? (
                isThinking ? (
                  /* Thinking State */
                  <div className="flex flex-col justify-center animate-in fade-in duration-300">
                    <h2 className="text-3xl font-semibold text-neutral-grayscale-90">
                      Thinking...
                    </h2>
                    <p className="text-lg text-neutral-grayscale-60 leading-relaxed">
                      Analyzing context and available actions...
                    </p>
                    <div className="h-10 mt-2 flex items-center">
                      {/* You can use a spinner or just the text animation above */}
                    </div>
                  </div>
                ) : (
                  /* Bulk Actions State */
                  <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <h2
                      className="text-3xl font-semibold text-neutral-grayscale-90"
                      data-testid="project-context-bulk-title"
                    >
                      What do we do with these files?
                    </h2>
                    <p className="text-lg text-neutral-grayscale-60 leading-relaxed mb-loop-4">
                      Select an action for the {selectedFilesCount} selected{' '}
                      {selectedFilesCount === 1 ? 'file' : 'files'}.
                    </p>

                    {/* Bulk action buttons */}
                    <div className="flex flex-wrap gap-loop-2">
                      {onDownloadSelected && (
                        <ControlButton
                          type="white"
                          size="lg"
                          fontSize={11}
                          text={
                            isBulkDownloading
                              ? 'Downloading...'
                              : `Download (${selectedFilesCount})`
                          }
                          icon={<DownloadCloud width={16} height={16} />}
                          onClick={onDownloadSelected}
                          disabled={isBulkDownloading}
                        />
                      )}
                      {onStartLoop && (
                        <ControlButton
                          type="white"
                          size="lg"
                          fontSize={11}
                          text="Add to new Loop"
                          icon={<LoopOpsIcon width={16} height={16} />}
                          onClick={onStartLoop}
                        />
                      )}
                      {onDeleteSelected && (
                        <ControlButton
                          type="white"
                          size="lg"
                          fontSize={11}
                          text={
                            isBulkDeleting
                              ? 'Deleting...'
                              : `Delete files (${selectedFilesCount})`
                          }
                          icon={<Trash2 width={16} height={16} />}
                          onClick={onDeleteSelected}
                          disabled={isBulkDeleting}
                        />
                      )}
                    </div>
                  </div>
                )
              ) : (
                <>
                  <h2
                    className="text-3xl font-semibold text-neutral-grayscale-90"
                    data-testid="project-context-welcome-title"
                  >
                    {title}
                  </h2>
                  <p
                    className="text-lg text-neutral-grayscale-60 leading-relaxed"
                    data-testid="project-context-welcome-description"
                  >
                    {description}
                  </p>
                  {description2 && (
                    <p className="text-lg font-bold text-neutral-grayscale-60 leading-relaxed">
                      {description2}
                    </p>
                  )}
                  <div className="flex space-x-4">
                    <ControlButton
                      size="lg"
                      text={buttonText}
                      fontSize={14}
                      onClick={handleButtonClick}
                      disabled={isLoading}
                      isLoading={isLoading}
                      className="!w-full font-bold"
                      data-testid="project-context-start-stage-btn"
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  },
);

ProjectContext2Section.displayName = 'ProjectContext2Section';
