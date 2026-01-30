import { useMutation, useQueryClient } from '@tanstack/react-query';
import { IntegrationsService, GenerateCodeRequest, ExchangeCodeRequest } from '@/services/IntegrationsService';
import { useToast } from '@/hooks/use-toast';

export const integrationsQueryKeys = {
  all: ['integrations'] as const,
  detail: (integrationId: string) => ['integrations', integrationId] as const,
  code: (integrationId: string) => ['integrations', integrationId, 'code'] as const,
};

interface UseGenerateCodeParams {
  integrationType: string;
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
}

export const useGenerateCode = ({ integrationType, onSuccess, onError }: UseGenerateCodeParams) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: GenerateCodeRequest) => {
      const response = await IntegrationsService.generateCode(integrationType, payload);
      return response;
    },
    onSuccess: (data) => {
      toast({
        title: 'Code generated',
        description: 'Your code is ready',
      });
      
      queryClient.invalidateQueries({ 
        queryKey: integrationsQueryKeys.code(integrationType) 
      });

      onSuccess?.(data);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to generate code',
        variant: 'destructive',
      });
      
      console.error('Generate code error:', error);
      onError?.(error);
    },
  });
};

interface UseExchangeCodeParams {
  integrationType: string;
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
}

export const useExchangeCode = ({ integrationType, onSuccess, onError }: UseExchangeCodeParams) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: ExchangeCodeRequest) => {
      const response = await IntegrationsService.exchangeCode(integrationType, payload);
      return response;
    },
    onSuccess: (data) => {
      toast({
        title: 'Authentication successful',
        description: 'Integration connected',
      });
      
      queryClient.invalidateQueries({ 
        queryKey: integrationsQueryKeys.all 
      });

      onSuccess?.(data);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to authenticate',
        variant: 'destructive',
      });
      
      console.error('Exchange code error:', error);
      onError?.(error);
    },
  });
};
