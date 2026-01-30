import { useEffect, useRef, useCallback } from 'react';

interface UseScrollToBottomOptions {
  threshold?: number;
  behavior?: ScrollBehavior;
  enabled?: boolean;
  delay?: number;
}

export const useScrollToBottom = (
  dependencies: any[] = [],
  options: UseScrollToBottomOptions = {},
) => {
  const {
    threshold = 100,
    behavior = 'smooth',
    enabled = true,
    delay = 0,
  } = options;

  const containerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isUserScrollingRef = useRef(false);
  const lastScrollTopRef = useRef(0);

  const shouldAutoScroll = useCallback(() => {
    if (!enabled || !containerRef.current) return false;

    const container = containerRef.current;
    const { scrollTop, scrollHeight, clientHeight } = container;

    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    return distanceFromBottom <= threshold;
  }, [enabled, threshold]);

  const scrollToBottom = useCallback(
    (force = false) => {
      if (!containerRef.current || (!force && !shouldAutoScroll())) return;

      const container = containerRef.current;

      if (delay > 0) {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
          container.scrollTo({
            top: container.scrollHeight,
            behavior,
          });
        }, delay);
      } else {
        container.scrollTo({
          top: container.scrollHeight,
          behavior,
        });
      }
    },
    [shouldAutoScroll, behavior, delay],
  );

  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const currentScrollTop = container.scrollTop;

    // Detect if user is actively scrolling up
    if (currentScrollTop < lastScrollTopRef.current) {
      isUserScrollingRef.current = true;
    } else if (shouldAutoScroll()) {
      isUserScrollingRef.current = false;
    }

    lastScrollTopRef.current = currentScrollTop;
  }, [shouldAutoScroll]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [handleScroll]);

  useEffect(() => {
    if (enabled && !isUserScrollingRef.current) {
      scrollToBottom();
    }
  }, dependencies); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    containerRef,
    scrollToBottom: (force = false) => scrollToBottom(force),
    isNearBottom: shouldAutoScroll(),
    resetUserScrolling: () => {
      isUserScrollingRef.current = false;
    },
  };
};
