import { callBackendApi } from '@/utils/backendApiHelper';

export interface GenerateCodeRequest {
  project_id: string;
  workspace_id: string;
  [key: string]: any;
}

export interface GenerateCodeResponse {
  code: string;
  expires_at: string;
}

export interface ExchangeCodeRequest {
  code: string;
  [key: string]: any;
}

export interface ExchangeCodeResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  user_id?: string;
  metadata?: Record<string, any>;
}

export class IntegrationsService {
  static async generateCode(
    integrationType: string,
    payload: GenerateCodeRequest,
  ): Promise<GenerateCodeResponse> {
    try {
      const response = await callBackendApi<GenerateCodeResponse>(
        `/api/v1/integrations/${integrationType}/generate-code`,
        'POST',
        payload,
        {
          timeout: 60000,
        },
      );

      return response;
    } catch (error) {
      console.error(`Error generating code for ${integrationType}:`, error);
      throw error;
    }
  }

  static async exchangeCode(
    integrationType: string,
    payload: ExchangeCodeRequest,
  ): Promise<ExchangeCodeResponse> {
    try {
      const response = await callBackendApi<ExchangeCodeResponse>(
        `/api/v1/integrations/${integrationType}/auth/exchange`,
        'POST',
        payload,
        {
          timeout: 30000,
        },
      );

      return response;
    } catch (error) {
      console.error(`Error exchanging code for ${integrationType}:`, error);
      throw error;
    }
  }
}
