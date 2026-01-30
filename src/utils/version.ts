interface VersionInfo {
  version: string;
  build: string;
}

export const getVersionInfo = (): VersionInfo => {
  try {
    // In development, we'll use a fallback
    if (import.meta.env.DEV) {
      return {
        version: '1.0.0',
        build: 'dev',
      };
    }

    // In production, we'll try to fetch from the version.json file
    // This will be available in the public directory after build
    const versionData = JSON.parse(
      localStorage.getItem('app-version') || '{"version":"1.0.0","build":"1"}',
    );
    return versionData;
  } catch (error) {
    console.warn('Failed to load version info:', error);
    return {
      version: '1.0.0',
      build: 'unknown',
    };
  }
};

export const getFullVersion = (): string => {
  const { version, build } = getVersionInfo();
  return `${version}-build.${build}`;
};

export const getDisplayVersion = (): string => {
  const { version, build } = getVersionInfo();
  return `v${version} (${build})`;
};
