import { useState, useCallback, useEffect, useRef } from 'react';

interface UseSidebarResizeProps {
  minWidth?: number;
  maxWidth?: number;
  defaultWidth?: number;
  side: 'left' | 'right';
  onWidthChange?: (width: number) => void;
}

interface UseSidebarResizeReturn {
  width: number;
  isResizing: boolean;
  handleMouseDown: (e: React.MouseEvent) => void;
  sidebarStyle: React.CSSProperties;
  setWidth: (width: number) => void;
}

export const useSidebarResize = ({
  minWidth = 40,
  maxWidth = 240,
  defaultWidth = 40,
  side,
  onWidthChange,
}: UseSidebarResizeProps): UseSidebarResizeReturn => {
  const [width, setWidth] = useState(defaultWidth);
  const [isResizing, setIsResizing] = useState(false);
  const startXRef = useRef<number>(0);
  const startWidthRef = useRef<number>(0);

  // Call onWidthChange when width changes
  useEffect(() => {
    onWidthChange?.(width);
  }, [width, onWidthChange]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsResizing(true);
      startXRef.current = e.clientX;
      startWidthRef.current = width;
      document.body.style.cursor = 'ew-resize';
      document.body.style.userSelect = 'none';
    },
    [width],
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing) return;

      const deltaX = e.clientX - startXRef.current;
      const newWidth =
        side === 'left'
          ? startWidthRef.current + deltaX
          : startWidthRef.current - deltaX;

      const clampedWidth = Math.min(Math.max(newWidth, minWidth), maxWidth);
      setWidth(clampedWidth);
    },
    [isResizing, minWidth, maxWidth, side],
  );

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing, handleMouseMove, handleMouseUp]);

  const clampedSetWidth = useCallback(
    (newWidth: number) => {
      const clampedWidth = Math.min(Math.max(newWidth, minWidth), maxWidth);
      setWidth(clampedWidth);
    },
    [minWidth, maxWidth],
  );

  const sidebarStyle: React.CSSProperties = {
    width: `${width}px`,
    transition: isResizing ? 'none' : 'width 0.2s ease-in-out',
  };

  return {
    width,
    isResizing,
    handleMouseDown,
    sidebarStyle,
    setWidth: clampedSetWidth,
  };
};
