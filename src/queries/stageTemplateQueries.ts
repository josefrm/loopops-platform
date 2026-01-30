import { StageTemplateService } from '@/services/StageTemplateService';
import { useQuery } from '@tanstack/react-query';

export const stageTemplateKeys = {
  all: ['stage-templates'] as const,
  templateId: (stageId: string | null) =>
    [...stageTemplateKeys.all, 'template-id', stageId] as const,
  templateDetails: (
    templateId: string | null,
    workspaceId: string | undefined,
  ) =>
    [
      ...stageTemplateKeys.all,
      'template-details',
      templateId,
      workspaceId,
    ] as const,
};

export const useStageTemplateId = (stageId: string | null) => {
  return useQuery({
    queryKey: stageTemplateKeys.templateId(stageId),
    queryFn: async () => {
      if (!stageId) return null;
      return StageTemplateService.findTemplateForStage(stageId);
    },
    enabled: true,
    staleTime: Infinity,
    gcTime: 30 * 60 * 1000,
  });
};

export const useStageTemplateDetails = (
  templateId: string | null,
  workspaceId: string | undefined,
) => {
  return useQuery({
    queryKey: stageTemplateKeys.templateDetails(templateId, workspaceId),
    queryFn: async () => {
      if (!templateId || !workspaceId) return null;
      return StageTemplateService.getTemplateDetails(templateId, workspaceId);
    },
    enabled: !!templateId && !!workspaceId,
    staleTime: Infinity,
    gcTime: 30 * 60 * 1000,
  });
};
