import { cn } from '@/lib/utils';
import { AlertCircle } from 'lucide-react';

interface StageTemplateEmptyStateProps {
  className?: string;
}

export const StageTemplateEmptyState = ({
  className,
}: StageTemplateEmptyStateProps) => {
  return (
    <div
      className={cn('flex items-center justify-center h-full', className)}
      data-testid="stage-template-empty-state"
    >
      <div
        className="text-center p-8 max-w-md"
        data-testid="stage-template-empty-state-content"
      >
        <div className="mb-4">
          <AlertCircle className="mx-auto h-loop-10 w-12 text-neutral-grayscale-40" />
        </div>
        <h3
          className="text-lg font-medium text-neutral-grayscale-90 mb-2"
          data-testid="stage-template-empty-title"
        >
          No Template Available
        </h3>
        <p
          className="text-sm text-neutral-grayscale-60"
          data-testid="stage-template-empty-description"
        >
          Select a different stage to continue.
        </p>
      </div>
    </div>
  );
};
