import { useEffect } from 'react';

interface UseSidebarThresholdOptions {
  width: number;
  isMaximized: boolean;
  setMaximized: (value: boolean) => void;
  threshold?: number;
}

export const useSidebarThreshold = ({
  width,
  isMaximized,
  setMaximized,
  threshold = 150,
}: UseSidebarThresholdOptions) => {
  useEffect(() => {
    const shouldBeMaximized = width >= threshold;
    if (shouldBeMaximized !== isMaximized) {
      setMaximized(shouldBeMaximized);
    }
    // internal logic relies on width changes, checking isMaximized could cause race conditions
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, setMaximized, threshold]);
};
