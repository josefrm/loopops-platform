type EnvKey = keyof ImportMetaEnv;
export function getEnv<T = string>(
  key: EnvKey,
  fallback?: T,
): T | string | undefined {
  const value = import.meta.env[key];
  return value !== undefined ? value : fallback;
}

export function hasEnv(key: EnvKey): boolean {
  return import.meta.env[key] !== undefined;
}

export function isDev(): boolean {
  return import.meta.env.DEV;
}

export function isProd(): boolean {
  return import.meta.env.PROD;
}

export function getBackendApiUrl(): string {
  return getEnv('VITE_BACKEND_API_URL', '') as string;
}

export function isBackendApiConfigured(): boolean {
  const url = getBackendApiUrl();
  return url !== '';
}
