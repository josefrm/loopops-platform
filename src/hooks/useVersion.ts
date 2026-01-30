import { useState, useEffect } from 'react';

interface VersionInfo {
  version: string;
  build: string;
}

export const useVersion = () => {
  const [versionInfo, setVersionInfo] = useState<VersionInfo>({
    version: '1.0.0',
    build: 'loading...',
  });

  useEffect(() => {
    const loadVersion = async () => {
      try {
        // Try to fetch version from public directory
        const response = await fetch('/version.json');
        if (response.ok) {
          const data = await response.json();
          setVersionInfo(data);
          // Store in localStorage for offline access
          localStorage.setItem('app-version', JSON.stringify(data));
        } else {
          // Fallback to localStorage or default
          const stored = localStorage.getItem('app-version');
          if (stored) {
            setVersionInfo(JSON.parse(stored));
          } else {
            setVersionInfo({ version: '1.0.0', build: 'unknown' });
          }
        }
      } catch (error) {
        console.warn('Failed to load version:', error);
        // Fallback to localStorage or default
        const stored = localStorage.getItem('app-version');
        if (stored) {
          setVersionInfo(JSON.parse(stored));
        } else {
          setVersionInfo({ version: '1.0.0', build: 'unknown' });
        }
      }
    };

    loadVersion();
  }, []);

  const getFullVersion = () =>
    `${versionInfo.version}-build.${versionInfo.build}`;
  const getDisplayVersion = () =>
    `v${versionInfo.version} (${versionInfo.build})`;

  return {
    versionInfo,
    getFullVersion,
    getDisplayVersion,
  };
};
