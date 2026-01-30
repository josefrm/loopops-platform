import { supabase } from '@/integrations/supabase/client';

// Types
export class EdgeFunctionError extends Error {
  constructor(
    message: string,
    public functionName: string,
    public statusCode?: number,
    public originalError?: any,
  ) {
    super(message);
    this.name = 'EdgeFunctionError';
  }
}

export interface EdgeFunctionOptions {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  signal?: AbortSignal;
  logRequest?: boolean;
  logResponse?: boolean;
}

// Constants
const DEFAULT_OPTIONS: Required<Omit<EdgeFunctionOptions, 'signal'>> = {
  timeout: 30000,
  retries: 0,
  retryDelay: 1000,
  logRequest: false,
  logResponse: false,
};

const RETRYABLE_STATUS_CODES = [408, 429, 500, 502, 503, 504];

// Helpers
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isRetryableError = (error: any): boolean => {
  if (error instanceof Error) {
    const isNetworkError =
      error.message.includes('network') || error.message.includes('fetch');
    const isAbortError = error.name === 'AbortError';
    if (isNetworkError || isAbortError) return true;
  }

  if (isEdgeFunctionError(error) && error.statusCode) {
    return RETRYABLE_STATUS_CODES.includes(error.statusCode);
  }

  return false;
};

const combineAbortSignals = (signals: AbortSignal[]): AbortSignal => {
  const controller = new AbortController();

  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort();
      break;
    }
    signal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  return controller.signal;
};

// Edge Function Client
export async function callSupabaseFunction<T>(
  functionName: string,
  body: any,
  options: EdgeFunctionOptions = {},
): Promise<T> {
  const config = { ...DEFAULT_OPTIONS, ...options };
  let lastError: any = null;
  let attempt = 0;

  if (config.logRequest) {
    console.log(`[EdgeFunction] ${functionName}:`, body);
  }

  while (attempt <= config.retries) {
    try {
      const timeoutController = new AbortController();
      const timeoutId = setTimeout(
        () => timeoutController.abort(),
        config.timeout,
      );

      const combinedSignal = options.signal
        ? combineAbortSignals([options.signal, timeoutController.signal])
        : timeoutController.signal;

      try {
        const startTime = Date.now();

        const abortPromise = new Promise((_, reject) => {
          combinedSignal.addEventListener('abort', () => {
            reject(new Error('AbortError'));
          });
        });

        const invokePromise = supabase.functions.invoke(functionName, {
          body,
          headers: {
            'x-attempt': String(attempt + 1),
            'x-max-retries': String(config.retries),
            'Cache-Control': 'no-cache',
          },
        });

        const { data, error } = (await Promise.race([
          invokePromise,
          abortPromise,
        ])) as any;

        clearTimeout(timeoutId);

        const duration = Date.now() - startTime;

        if (config.logResponse) {
          console.log(
            `[EdgeFunction] Response from ${functionName} (${duration}ms):`,
            {
              data,
              error,
              attempt: attempt + 1,
            },
          );
        }

        if (error) {
          throw new EdgeFunctionError(
            error.message || 'Unknown error from Edge Function',
            functionName,
            error.status,
            error,
          );
        }

        return data as T;
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error) {
      lastError = error;

      if (error instanceof Error && error.name === 'AbortError') {
        throw new EdgeFunctionError(
          'Request was aborted (timeout or cancelled)',
          functionName,
          408,
          error,
        );
      }

      const isTransientError = isRetryableError(error);

      if (attempt < config.retries && isTransientError) {
        console.warn(
          `[EdgeFunction] Retry ${attempt + 1}/${
            config.retries
          } for ${functionName}:`,
          error,
        );
        await sleep(config.retryDelay);
      } else if (attempt < config.retries && !isTransientError) {
        // Non-transient error, don't retry
        break;
      }

      attempt++;
    }
  }

  throw new EdgeFunctionError(
    `Failed after ${config.retries + 1} attempts: ${
      lastError?.message || 'Unknown error'
    }`,
    functionName,
    lastError?.statusCode,
    lastError,
  );
}

// Type guards
export const isEdgeFunctionError = (error: any): error is EdgeFunctionError =>
  error instanceof EdgeFunctionError;

export const isRateLimitError = (error: any): boolean =>
  isEdgeFunctionError(error) && error.statusCode === 429;

export const isAuthenticationError = (error: any): boolean =>
  isEdgeFunctionError(error) && error.statusCode === 401;

export const isTimeoutError = (error: any): boolean =>
  isEdgeFunctionError(error) && error.statusCode === 408;
