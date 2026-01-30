import { useToast } from '@/hooks/use-toast';
import { type SortOption } from '@/hooks/useFileFilters';
import { useLoopSessions } from '@/hooks/useLoopSessions';
import { cn } from '@/lib/utils';
import React, { useCallback, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AILoadingState } from '../ui/AILoadingState';
import { CircleControlIcon } from '../ui/CircleControlIcon';
import { InformationTileAction } from '../ui/InformationTile';
import { ExternalLoopItemIcon } from '../ui/icons/ExternalLoopItemIcon';
import { LoopItemContent } from './LoopItemContent';
import { Stage } from './TabNavigationControl';

interface ExternalLoopsDisplayProps {
  stage: Stage | null;
  sortBy?: SortOption;
}

const generateExternalActions = (): InformationTileAction[] => {
  return [
    /**
    {
      id: 'open-external',
      icon: <ExternalLink size={16} className="text-neutral-grayscale-50" />,
      label: 'Open External Details',
      onClick: async () => {
        console.log('Open external details for', item.title);
      },
    },
    {
      id: 'trash',
      icon: isDeleting ? (
        <Loader2 size={16} className="text-neutral-grayscale-50 animate-spin" />
      ) : (
        <Trash
          size={16}
          className="text-neutral-grayscale-50 fill-neutral-grayscale-50"
        />
      ),
      label: 'Remove from loop',
      onClick: async () => {
        if (item.sessionId && !isDeleting) {
          await onDelete(item.sessionId, item.title);
        }
      },
    },
     */
  ];
};

export const ExternalLoopsDisplay: React.FC<ExternalLoopsDisplayProps> = ({
  stage,
  sortBy = 'newest-to-oldest',
}) => {
  const { items: allItems, isLoading } = useLoopSessions({
    stage,
  });
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const [selectedFilters, setSelectedFilters] = useState<string[]>(['figma']);

  const filters = [
    { name: 'Figma', value: 'figma', image: '/icons/Figma.svg' },
    { name: 'Miro', value: 'miro', image: '/icons/Miro.svg' },
    { name: 'Bitbucket', value: 'bitbucket', image: '/icons/Bitbucket.svg' },
    // Add more filters as needed
  ];

  const externalItems = useMemo(() => {
    // Filter for plugin items
    let filtered = allItems.filter((item) => item.is_plugin);

    // Apply chip_name filter if selected
    if (selectedFilters.length > 0) {
      filtered = filtered.filter((item) =>
        item.chip_name
          ? selectedFilters.includes(item.chip_name.toLowerCase())
          : false,
      );
    }

    return [...filtered].sort((a, b) => {
      if (sortBy === 'newest-to-oldest') {
        return b.created_at.getTime() - a.created_at.getTime();
      }
      if (sortBy === 'oldest-to-newest') {
        return a.created_at.getTime() - b.created_at.getTime();
      }
      if (sortBy === 'alphabetical') {
        return a.title.localeCompare(b.title);
      }
      if (sortBy === 'alphabetical-z-a') {
        return b.title.localeCompare(a.title);
      }
      return 0;
    });
  }, [allItems, sortBy, selectedFilters]);

  const handleNavigateToChat = useCallback(
    (sessionId: string) => {
      if (!stage) return;
      const params = new URLSearchParams(searchParams);
      params.set('stage', stage.priority.toString());
      params.set('session_id', sessionId);
      navigate(`/chat?${params.toString()}`);
    },
    [navigate, stage, searchParams],
  );

  const handleShowMilestones = useCallback(
    (sessionId: string, milestonesCount: number) => {
      toast({
        title: 'Milestones',
        description: `This loop has ${milestonesCount} milestone${
          milestonesCount !== 1 ? 's' : ''
        }`,
      });
    },
    [toast],
  );

  const generateActionsWithType = useCallback(() => {
    return generateExternalActions();
  }, []);

  const handleToggleFilter = (value: string) => {
    setSelectedFilters((prev) =>
      prev.includes(value)
        ? prev.filter((item) => item !== value)
        : [...prev, value],
    );
  };

  // handleFilterClick removed as it is replaced by handleToggleFilter

  return (
    <div className="flex flex-col h-full space-y-loop-5">
      {/* Filter Buttons */}
      <div className="flex gap-loop-2 mb-loop-4 space-x-loop-4">
        {filters.map((filter) => {
          const isSelected = selectedFilters.includes(filter.value);
          return (
            <div
              key={filter.value}
              className="flex items-center space-x-loop-2 cursor-pointer"
              onClick={() => handleToggleFilter(filter.value)}
            >
              <CircleControlIcon
                size="xl"
                icon={null}
                image={filter.image}
                label={filter.name}
                active={isSelected}
                className={cn(
                  'border transition-colors w-loop-8 h-loop-8',
                  isSelected
                    ? 'bg-neutral-grayscale-90 border-neutral-grayscale-90'
                    : 'bg-white border-neutral-grayscale-30 hover:border-neutral-grayscale-50',
                )}
                // Allow click to bubble to parent div
              />
              <p
                className={cn(
                  'ml-loop-2 text-base transition-colors',
                  isSelected
                    ? 'text-neutral-grayscale-90 font-medium'
                    : 'text-neutral-grayscale-40',
                )}
              >
                {filter.name}
              </p>
            </div>
          );
        })}
      </div>

      <div
        className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 scrollbar-hide"
        style={{
          maskImage:
            'linear-gradient(to bottom, black calc(100% - 48px), transparent 100%)',
          WebkitMaskImage:
            'linear-gradient(to bottom, black calc(100% - 48px), transparent 100%)',
        }}
      >
        {!stage || isLoading ? (
          <div className="flex items-center justify-center h-full p-loop-8">
            <AILoadingState message="Loading external loops..." />
          </div>
        ) : (
          <>
            {externalItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-loop-8 text-center bg-gray-50 rounded-lg border border-dashed border-gray-200">
                <p className="text-neutral-grayscale-50 text-base font-medium">
                  {selectedFilters.length > 0
                    ? `No loops found for: ${selectedFilters
                        .map(
                          (f) => filters.find((fil) => fil.value === f)?.name,
                        )
                        .join(', ')}.`
                    : 'No external loops found.'}
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-loop-4 pb-loop-1">
                {externalItems.map((item) => {
                  const actions = generateActionsWithType();
                  return (
                    <div key={item.id}>
                      <LoopItemContent
                        data={item}
                        actions={actions}
                        icon={<ExternalLoopItemIcon type={item.chip_name} />}
                        onOpenLoop={() =>
                          item.sessionId && handleNavigateToChat(item.sessionId)
                        }
                        onShowMilestones={() =>
                          item.sessionId &&
                          handleShowMilestones(item.sessionId, 0)
                        }
                        milestonesCount={0}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
