import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { PlusIcon } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { Project } from '../../stores/workspaceProjectStore';

interface ProjectSelectorProps {
  selectedProject: Project | null;
  availableProjects: Project[];
  onProjectChange: (projectId: string) => Promise<void>;
  onCreateNewProject?: () => void;
  isLoading?: boolean;
  keepOpen?: boolean; // For debugging purposes
  isOpen?: boolean; // Controlled open state
  onOpenChange?: (open: boolean) => void; // Controlled open change handler
  highlightProjectId?: string | null; // Project ID to highlight/blink
  canCreateProject?: boolean; // Whether user can create new projects (owner only)
}

export const ProjectSelector: React.FC<ProjectSelectorProps> = ({
  selectedProject,
  availableProjects,
  onProjectChange,
  onCreateNewProject,
  isLoading = false,
  keepOpen = false,
  isOpen,
  onOpenChange,
  highlightProjectId,
  canCreateProject = true,
}) => {
  const [blinkingId, setBlinkingId] = useState<string | null>(null);

  // Handle highlight/blink effect
  useEffect(() => {
    if (highlightProjectId) {
      setBlinkingId(highlightProjectId);
      // Remove blink effect after animation
      const timer = setTimeout(() => {
        setBlinkingId(null);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [highlightProjectId]);

  return (
    <Select
      open={keepOpen ? true : isOpen}
      value={selectedProject?.id || ''}
      onValueChange={(value) => {
        if (value === '__create_new__') {
          onCreateNewProject?.();
          return;
        }
        const project = availableProjects.find((p) => p.id === value);
        if (project) onProjectChange(project.id);
      }}
      onOpenChange={(open) => {
        // If keepOpen is true, prevent closing completely
        if (keepOpen) {
          return;
        }
        onOpenChange?.(open);
      }}
      disabled={isLoading || availableProjects.length === 0}
    >
      <SelectTrigger className="w-full h-loop-8 rounded-sm bg-neutral-grayscale-0 text-neutral-grayscale-50 text-base border border-neutral-grayscale-50">
        <SelectValue>
          <div className="flex items-center space-x-2">
            {isLoading ? (
              <span className="truncate text-neutral-grayscale-60">
                Loading projects...
              </span>
            ) : selectedProject ? (
              <span className="truncate">{selectedProject.name}</span>
            ) : availableProjects.length === 0 ? (
              <span className="truncate text-neutral-grayscale-60">
                No projects available
              </span>
            ) : (
              <span className="truncate text-neutral-grayscale-60">
                Select a project
              </span>
            )}
          </div>
        </SelectValue>
      </SelectTrigger>
      <SelectContent
        showDividers={false}
        chevronClassName="text-neutral-grayscale-50"
        className="max-h-[300px] w-[var(--radix-select-trigger-width)] min-w-0 p-loop-4 shadow-lg bg-neutral-grayscale-0 rounded-md border border-neutral-grayscale-20"
        onCloseAutoFocus={(e) => {
          if (keepOpen) {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
        onEscapeKeyDown={(e) => {
          if (keepOpen) {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
        onPointerDownOutside={(e) => {
          if (keepOpen) {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
      >
        {availableProjects.map((project) => (
          <SelectItem
            key={project.id}
            value={project.id}
            className={cn(
              'p-loop-2 text-md cursor-pointer transition-colors duration-200 text-neutral-grayscale-50 rounded-xs focus:bg-neutral-grayscale-10 focus:text-neutral-grayscale-90 data-[state=checked]:bg-neutral-grayscale-10 data-[state=checked]:text-neutral-grayscale-90',
              blinkingId === project.id &&
                'animate-blink-twice bg-brand-accent-15 text-brand-accent-60',
            )}
          >
            <div className="flex flex-col space-y-1">
              <span className="font-medium text-base">{project.name}</span>
            </div>
          </SelectItem>
        ))}

        {/* Create new project option - only shown if user is owner */}
        {canCreateProject && (
          <SelectItem
            key="__create_new__"
            value="__create_new__"
            className="p-loop-2 text-md rounded-md cursor-pointer transition-all duration-200 bg-brand-accent-50 focus:bg-brand-accent-10 focus:text-brand-accent-60 data-[state=checked]:bg-brand-accent-10 data-[state=checked]:text-brand-accent-60 hover:bg-brand-accent-15 hover:bg-neutral-grayscale-90 hover:text-brand-accent-90 border-t border-neutral-grayscale-20 mt-1 pt-loop-2 [&>span]:w-full [&>span]:flex [&>span]:justify-center"
          >
            <div className="flex items-center justify-center w-full">
              <span className="flex font-medium text-base items-center gap-2 text-neutral-grayscale-0">
                <PlusIcon width={16} height={16} /> Create new Project
              </span>
            </div>
          </SelectItem>
        )}
      </SelectContent>
    </Select>
  );
};
