import { useAllModelCapabilities } from '@/hooks/useModelCapabilities';
import { useMemo } from 'react';

/**
 * Hook to fetch the model ID associated with a specific template
 * Uses cached capabilities data to avoid redundant API calls
 * @param templateId - The stage template ID to fetch the model for
 * @returns Object with model ID, capabilities data, and loading state
 */
export const useModelForTemplate = (templateId: string | undefined) => {
  const { data: allCapabilities, isLoading } = useAllModelCapabilities();

  const data = useMemo(() => {
    if (!allCapabilities || !templateId) return null;

    // Find the capability that includes this template in usedByAgents or usedByTeams
    const capability = allCapabilities.find(
      (cap) =>
        (cap.usedByAgents && cap.usedByAgents.includes(templateId)) ||
        (cap.usedByTeams && cap.usedByTeams.includes(templateId)),
    );

    return capability ? capability.modelId : null;
  }, [allCapabilities, templateId]);

  return {
    data,
    isLoading,
    // Expose allCapabilities so consumers don't need to call useAllModelCapabilities separately
    allCapabilities,
  };
};
