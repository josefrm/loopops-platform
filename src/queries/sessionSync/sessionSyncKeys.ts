export const sessionSyncKeys = {
  all: ['stage-sessions'] as const,
  byStage: (stageTemplateId: string, stageType: string, userId: string) => 
    [...sessionSyncKeys.all, stageTemplateId, stageType, userId] as const,
};
