import { Stage } from '@/components/projectContext/TabNavigationControl';
import { ProjectStageService } from '@/services/ProjectStageService';
import { useQuery } from '@tanstack/react-query';

export const useProjectStages = (projectId?: string) => {
  return useQuery<Stage[]>({
    queryKey: ['project-stages', projectId],
    queryFn: () => ProjectStageService.getStages(projectId),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};
