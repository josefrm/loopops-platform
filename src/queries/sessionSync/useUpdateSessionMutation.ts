import { useMutation } from '@tanstack/react-query';
import { SessionManagementService } from '@/services/SessionManagementService';

interface UpdateSessionNameOptions {
  sessionId: string;
  sessionName: string;
}

export const useUpdateSessionNameMutation = () => {

  return useMutation({
    mutationFn: async ({ sessionId, sessionName }: UpdateSessionNameOptions) => {
      await SessionManagementService.updateSessionName(sessionId, sessionName);
    },
  });
};
