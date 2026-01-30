import { useState, useCallback, useRef, useEffect } from 'react';
import { CurtainDirection } from '@/components/ui/CurtainTransition';

interface UseCurtainDragOptions {
  /** Direction of the curtain when threshold is reached */
  direction: CurtainDirection;
  /** Minimum drag distance (in pixels) to trigger curtain */
  threshold?: number;
  /** Maximum drag distance for visual feedback */
  maxDrag?: number;
  /** Resistance factor (0-1, lower = more resistance) */
  resistance?: number;
  /** Whether the drag is enabled */
  enabled?: boolean;
  /** Callback when threshold is reached */
  onThresholdReached?: () => void;
  /** Callback when drag is cancelled (didn't reach threshold) */
  onDragCancelled?: () => void;
}

interface UseCurtainDragReturn {
  /** Current drag offset (for transform) */
  dragOffset: number;
  /** Whether currently dragging */
  isDragging: boolean;
  /** Whether threshold was reached (for visual feedback) */
  thresholdReached: boolean;
  /** Props to spread on the draggable element */
  dragHandleProps: {
    onMouseDown: (e: React.MouseEvent) => void;
    onTouchStart: (e: React.TouchEvent) => void;
    style: React.CSSProperties;
  };
  /** Reset drag state */
  reset: () => void;
}

/**
 * Hook for implementing drag-to-trigger curtain gesture
 *
 * Usage:
 * ```tsx
 * const { dragOffset, isDragging, dragHandleProps } = useCurtainDrag({
 *   direction: 'left-to-right',
 *   onThresholdReached: () => triggerCurtain(...),
 * });
 *
 * return <div {...dragHandleProps}>Drag me</div>
 * ```
 */
export function useCurtainDrag({
  direction,
  threshold = 100,
  maxDrag = 150,
  resistance = 0.5,
  enabled = true,
  onThresholdReached,
  onDragCancelled,
}: UseCurtainDragOptions): UseCurtainDragReturn {
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [thresholdReached, setThresholdReached] = useState(false);

  const startPosRef = useRef<number>(0);
  const hasTriggeredRef = useRef(false);

  const isLeftToRight = direction === 'left-to-right';

  const reset = useCallback(() => {
    setDragOffset(0);
    setIsDragging(false);
    setThresholdReached(false);
    hasTriggeredRef.current = false;
  }, []);

  const handleDragStart = useCallback(
    (clientX: number) => {
      if (!enabled) return;

      startPosRef.current = clientX;
      hasTriggeredRef.current = false;
      setIsDragging(true);
      setThresholdReached(false);
    },
    [enabled],
  );

  const handleDragMove = useCallback(
    (clientX: number) => {
      if (!isDragging || !enabled || hasTriggeredRef.current) return;

      const delta = clientX - startPosRef.current;

      // For left-to-right, we want positive delta (dragging right)
      // For right-to-left, we want negative delta (dragging left)
      const effectiveDelta = isLeftToRight ? delta : -delta;

      // Only allow dragging in the intended direction
      if (effectiveDelta < 0) {
        setDragOffset(0);
        return;
      }

      // Apply resistance for a more natural feel
      const resistedDelta = Math.min(effectiveDelta * resistance, maxDrag);

      // Apply direction
      const finalOffset = isLeftToRight ? resistedDelta : -resistedDelta;
      setDragOffset(finalOffset);

      // Check threshold
      const reachedThreshold = effectiveDelta >= threshold;
      setThresholdReached(reachedThreshold);

      // Trigger if threshold reached
      if (reachedThreshold && !hasTriggeredRef.current) {
        hasTriggeredRef.current = true;
        // Small delay to show the threshold state before triggering
        setTimeout(() => {
          onThresholdReached?.();
          reset();
        }, 50);
      }
    },
    [
      isDragging,
      enabled,
      isLeftToRight,
      resistance,
      maxDrag,
      threshold,
      onThresholdReached,
      reset,
    ],
  );

  const handleDragEnd = useCallback(() => {
    if (!isDragging) return;

    if (!hasTriggeredRef.current) {
      // Animate back to original position
      setDragOffset(0);
      onDragCancelled?.();
    }

    setIsDragging(false);
    setThresholdReached(false);
  }, [isDragging, onDragCancelled]);

  // Mouse event handlers
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Only handle left click
      if (e.button !== 0) return;

      // Don't start drag on interactive elements
      const target = e.target as HTMLElement;
      if (
        target.closest('button') ||
        target.closest('a') ||
        target.closest('input') ||
        target.closest('[data-resize-indicator]') ||
        target.closest('[data-no-drag]')
      ) {
        return;
      }

      handleDragStart(e.clientX);
    },
    [handleDragStart],
  );

  // Touch event handlers
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      // Don't start drag on interactive elements
      const target = e.target as HTMLElement;
      if (
        target.closest('button') ||
        target.closest('a') ||
        target.closest('input') ||
        target.closest('[data-resize-indicator]') ||
        target.closest('[data-no-drag]')
      ) {
        return;
      }

      const touch = e.touches[0];
      if (touch) {
        handleDragStart(touch.clientX);
      }
    },
    [handleDragStart],
  );

  // Global mouse/touch move and up handlers
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      handleDragMove(e.clientX);
    };

    const handleTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (touch) {
        handleDragMove(touch.clientX);
      }
    };

    const handleMouseUp = () => {
      handleDragEnd();
    };

    const handleTouchEnd = () => {
      handleDragEnd();
    };

    // Add listeners
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, handleDragMove, handleDragEnd]);

  const dragHandleProps = {
    onMouseDown: handleMouseDown,
    onTouchStart: handleTouchStart,
    style: {
      transform: dragOffset !== 0 ? `translateX(${dragOffset}px)` : undefined,
      transition: isDragging
        ? 'none'
        : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      cursor: enabled ? 'grab' : undefined,
    } as React.CSSProperties,
  };

  return {
    dragOffset,
    isDragging,
    thresholdReached,
    dragHandleProps,
    reset,
  };
}
