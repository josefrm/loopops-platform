import { useEffect } from 'react';

interface UseSidebarSyncOptions {
  isMaximized: boolean;
  setWidth: (width: number) => void;
  maxWidth: number;
  minWidth: number;
}

export const useSidebarSync = ({
  isMaximized,
  setWidth,
  maxWidth,
  minWidth,
}: UseSidebarSyncOptions) => {
  useEffect(() => {
    if (isMaximized) {
      setWidth(maxWidth);
    } else {
      setWidth(minWidth);
    }
  }, [isMaximized, setWidth, maxWidth, minWidth]);
};
