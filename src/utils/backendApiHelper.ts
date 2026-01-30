import { supabase } from '@/integrations/supabase/client';
import { getBackendApiUrl } from '@/config/api';

export class BackendApiError extends Error {
  constructor(
    message: string,
    public endpoint: string,
    public statusCode?: number,
    public originalError?: any,
  ) {
    super(message);
    this.name = 'BackendApiError';
  }
}

export interface BackendApiOptions {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  queryParams?: Record<string, string | number | boolean>;
}

const DEFAULT_OPTIONS: BackendApiOptions = {
  timeout: 30000,
  retries: 1,
  retryDelay: 1000,
};

const RETRYABLE_STATUS_CODES = [408, 429, 500, 502, 503, 504];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isRetryableError = (statusCode?: number): boolean =>
  statusCode ? RETRYABLE_STATUS_CODES.includes(statusCode) : false;

export async function callBackendApi<T>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' = 'POST',
  body?: any,
  options: BackendApiOptions = {},
): Promise<T> {
  const config = { ...DEFAULT_OPTIONS, ...options };

  const BACKEND_API_URL = getBackendApiUrl();
  let url = `${BACKEND_API_URL}${endpoint}`;
  if (config.queryParams) {
    const params = new URLSearchParams();
    Object.entries(config.queryParams).forEach(([key, value]) => {
      params.append(key, String(value));
    });
    const queryString = params.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    throw new BackendApiError(
      'No active session. Please log in.',
      endpoint,
      401,
    );
  }

  let lastError: any = null;
  let attempt = 0;

  while (attempt <= config.retries) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), config.timeout);

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      };

      const requestOptions: RequestInit = {
        method,
        headers,
        signal: controller.signal,
      };

      if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        requestOptions.body = JSON.stringify(body);
      }

      if (attempt > 0) {
        console.log(
          `[BackendAPI] Retry ${attempt}/${config.retries} for ${method} ${url}`,
        );
      }

      const response = await fetch(url, requestOptions);
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        const errorMessage = await parseErrorMessage(errorText, response);

        throw new BackendApiError(errorMessage, endpoint, response.status);
      }

      if (response.status === 204) {
        return undefined as T;
      }

      const data = await response.json();
      return data as T;
    } catch (error) {
      lastError = error;

      if (error instanceof Error && error.name === 'AbortError') {
        throw new BackendApiError('Request timeout', endpoint, 408, error);
      }

      const statusCode = (error as BackendApiError).statusCode;
      const isTransientError = isRetryableError(statusCode);

      if (attempt < config.retries && isTransientError) {
        console.warn(
          `[BackendAPI] Retry ${attempt + 1}/${config.retries} for ${endpoint}:`,
          error,
        );
        await sleep(config.retryDelay);
        attempt++;
      } else {
        break;
      }
    }
  }

  if (lastError instanceof BackendApiError) {
    throw lastError;
  }

  throw new BackendApiError(
    `Failed after ${config.retries + 1} attempts: ${lastError?.message || 'Unknown error'}`,
    endpoint,
    (lastError as BackendApiError)?.statusCode,
    lastError,
  );
}

const parseErrorMessage = async (
  errorText: string,
  response: Response,
): Promise<string> => {
  let errorMessage = `HTTP ${response.status}: ${response.statusText}`;

  try {
    const errorJson = JSON.parse(errorText);
    errorMessage = errorJson.detail || errorJson.message || errorMessage;
  } catch {
    errorMessage = errorText || errorMessage;
  }

  return errorMessage;
};

export const isBackendApiError = (error: any): error is BackendApiError =>
  error instanceof BackendApiError;

export const isRateLimitError = (error: any): boolean =>
  isBackendApiError(error) && error.statusCode === 429;

export const isAuthError = (error: any): boolean =>
  isBackendApiError(error) && error.statusCode === 401;

export const isTimeoutError = (error: any): boolean =>
  isBackendApiError(error) && error.statusCode === 408;
