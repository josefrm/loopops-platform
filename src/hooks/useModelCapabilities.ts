import {
  ModelCapabilities,
  ModelCapabilitiesService,
} from '@/services/ModelCapabilitiesService';
import { useQuery } from '@tanstack/react-query';

export type { ModelCapabilities } from '@/services/ModelCapabilitiesService';

export const useAllModelCapabilities = () => {
  return useQuery<ModelCapabilities[]>({
    queryKey: ['modelCapabilities', 'all'],
    queryFn: async () => {
      return await ModelCapabilitiesService.getAllModelCapabilities();
    },
    staleTime: 5 * 60 * 1000,
  });
};
