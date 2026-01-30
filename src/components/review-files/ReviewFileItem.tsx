import { CircleControlIcon } from '@/components/ui/CircleControlIcon';
import { FileTypeIcon } from '@/components/ui/FileTypeIcon';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  useAvailableProjects,
  useCurrentProject,
  useProjectLoading,
} from '@/hooks/useCurrentProject';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { z } from 'zod';

// Zod validation schema for ReviewFile fields
const reviewFileSchema = z.object({
  category: z.string().min(1, 'Category is required'),
  project: z.string().min(1, 'Project is required'),
  summary: z.string().min(1, 'Summary is required'),
  keywords: z.string().min(1, 'Keywords are required'),
});

export interface ReviewFile {
  id: string;
  fileName: string;
  category: string;
  project: string;
  summary: string;
  keywords: string;
  shareWithWorkspace: boolean;
  hasMissingInfo?: boolean;
}

interface ReviewFileItemProps {
  file: ReviewFile;
  onUpdate: (id: string, updates: Partial<ReviewFile>) => void;
  onDelete: (id: string) => void;
  className?: string;
  disabled?: boolean;
}

export const ReviewFileItem: React.FC<ReviewFileItemProps> = ({
  file,
  onUpdate,
  onDelete,
  className,
  disabled = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Validate fields using Zod schema
  const fieldErrors = useMemo(() => {
    const result = reviewFileSchema.safeParse({
      category: file.category,
      project: file.project,
      summary: file.summary,
      keywords: file.keywords,
    });

    if (result.success) {
      return {};
    }

    // Convert Zod errors to a simple object
    const errors: Record<string, boolean> = {};
    result.error.errors.forEach((err) => {
      if (err.path[0]) {
        errors[err.path[0] as string] = true;
      }
    });
    return errors;
  }, [file.category, file.project, file.summary, file.keywords]);

  // Check if there are any errors related to summary or keywords (expanded fields)
  const hasExpandedFieldErrors = useMemo(() => {
    return fieldErrors.summary || fieldErrors.keywords;
  }, [fieldErrors]);

  // Auto-expand if there are errors in summary or keywords
  useEffect(() => {
    if (hasExpandedFieldErrors) {
      setIsExpanded(true);
    }
  }, [hasExpandedFieldErrors]);

  // Use the unified store hooks for projects
  const availableProjects = useAvailableProjects();
  const isLoadingProjects = useProjectLoading();
  const currentProject = useCurrentProject();

  // Auto-select current project if no project is set
  useEffect(() => {
    if (!file.project && currentProject?.name) {
      onUpdate(file.id, { project: currentProject.name });
    }
  }, [file.project, file.id, currentProject?.name, onUpdate]);

  return (
    <div
      className={cn(
        'border border-neutral-grayscale-20 rounded-xl bg-white p-loop-4 transition-all',
        className,
      )}
    >
      {/* Header Row */}
      <div className="flex items-center gap-loop-4">
        {/* File Icon */}
        <div className="flex-shrink-0 pt-1">
          <FileTypeIcon fileName={file.fileName} size={24} />
        </div>

        {/* File Name */}
        <div className="flex-1 min-w-[12vw] flex items-center pt-1.5">
          <span
            className="text-base font-semibold text-neutral-grayscale-90 truncate"
            title={file.fileName}
          >
            {file.fileName}
          </span>
        </div>

        {/* Category Input */}
        <div className="w-[12vw]">
          <Input
            value={file.category}
            onChange={(e) => onUpdate(file.id, { category: e.target.value })}
            placeholder="Category"
            autoComplete="off"
            autoFocus={false}
            className={cn(
              'h-loop-9 rounded-full text-neutral-grayscale-90 text-md placeholder:text-neutral-grayscale-30 focus-visible:ring-offset-0 focus-visible:ring-neutral-grayscale-30',
              fieldErrors.category
                ? 'border-system-error-50'
                : 'border-neutral-grayscale-20',
            )}
            disabled={disabled}
          />
        </div>

        {/* Project Select */}
        <div className="w-[12vw]">
          <Select
            value={file.project}
            onValueChange={(value) => onUpdate(file.id, { project: value })}
            disabled={isLoadingProjects || disabled}
          >
            <SelectTrigger
              className={cn(
                'h-loop-9 rounded-full bg-white text-neutral-grayscale-90 text-md',
                fieldErrors.project
                  ? 'border-system-error-50'
                  : 'border-neutral-grayscale-20',
              )}
            >
              <SelectValue
                placeholder={isLoadingProjects ? 'Loading...' : 'Project'}
                className="placeholder:text-neutral-grayscale-30"
              />
            </SelectTrigger>
            <SelectContent
              showDividers={false}
              chevronClassName="text-neutral-grayscale-50"
              className="max-h-[300px] w-[var(--radix-select-trigger-width)] min-w-0 p-loop-4 shadow-lg bg-neutral-grayscale-0 rounded-md border border-neutral-grayscale-20"
            >
              {availableProjects.map((proj) => (
                <SelectItem
                  key={proj.id}
                  value={proj.name}
                  className="p-loop-2 text-base cursor-pointer transition-colors duration-200 text-neutral-grayscale-50 rounded-xs focus:bg-neutral-grayscale-10 focus:text-neutral-grayscale-90 data-[state=checked]:bg-neutral-grayscale-10 data-[state=checked]:text-neutral-grayscale-90"
                >
                  {proj.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Summary Toggle */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 px-2 py-1.5 min-w-[11vw] justify-between text-sm font-semibold text-neutral-grayscale-90 hover:bg-neutral-grayscale-10 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={disabled}
        >
          <span>Summary & Keywords</span>
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {/* Company Wide Switch */}
        <div className="flex items-center w-[8vw] justify-center">
          <Switch
            checked={file.shareWithWorkspace}
            onCheckedChange={(checked) =>
              onUpdate(file.id, { shareWithWorkspace: checked })
            }
            className="data-[state=checked]:bg-system-success-50"
            disabled={disabled}
          />
        </div>

        {/* Delete Button */}
        <div>
          <CircleControlIcon
            icon={<Trash2 />}
            size="sm"
            type="gray" // Gray background, user can change if needed
            onClick={() => onDelete(file.id)}
            label="Delete"
            disabled={disabled}
          />
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="mt-loop-4 pt-loop-4 border-t border-neutral-grayscale-20 flex gap-loop-6">
          {/* Summary */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-neutral-grayscale-50 mb-2">
              Summary
            </label>
            <textarea
              value={file.summary}
              onChange={(e) => onUpdate(file.id, { summary: e.target.value })}
              className={cn(
                'w-full p-loop-4 rounded-sm bg-neutral-grayscale-0 text-md text-neutral-grayscale-90 leading-relaxed min-h-[80px] resize-none focus:outline-none focus:ring-2 focus:ring-brand-accent-50 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-neutral-grayscale-30',
                fieldErrors.summary
                  ? 'border border-system-error-50'
                  : 'border border-neutral-grayscale-20',
              )}
              placeholder="Enter summary..."
              disabled={disabled}
            />
          </div>

          {/* Keywords */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-neutral-grayscale-50 mb-2">
              Keywords
            </label>
            <textarea
              value={file.keywords}
              onChange={(e) => onUpdate(file.id, { keywords: e.target.value })}
              className={cn(
                'w-full p-loop-4 rounded-sm bg-white text-md text-neutral-grayscale-90 leading-relaxed min-h-[80px] resize-none focus:outline-none focus:ring-2 focus:ring-brand-accent-50 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-neutral-grayscale-30',
                fieldErrors.keywords
                  ? 'border border-system-error-50'
                  : 'border border-neutral-grayscale-20',
              )}
              placeholder="Enter keywords..."
              disabled={disabled}
            />
          </div>
        </div>
      )}
    </div>
  );
};
