import { useState, useEffect, useCallback, useRef } from 'react';

interface UseTypingEffectOptions {
  speed?: number;
  interval?: number;
  onComplete?: () => void;
  disabled?: boolean;
}

export const useTypingEffect = (
  targetText: string,
  options: UseTypingEffectOptions = {},
) => {
  const { speed = 2, interval = 50, onComplete, disabled = false } = options;

  const [displayText, setDisplayText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentIndexRef = useRef(0);
  const targetTextRef = useRef(targetText);

  // Update target text when it changes (for streaming)
  useEffect(() => {
    targetTextRef.current = targetText;
  }, [targetText]);

  const startTyping = useCallback(() => {
    if (disabled) {
      setDisplayText(targetText);
      return;
    }

    setIsTyping(true);
    currentIndexRef.current = 0;
    setDisplayText('');

    intervalRef.current = setInterval(() => {
      const currentTarget = targetTextRef.current;
      const currentIndex = currentIndexRef.current;

      if (currentIndex >= currentTarget.length) {
        setIsTyping(false);
        setDisplayText(currentTarget);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        onComplete?.();
        return;
      }

      const nextIndex = Math.min(currentIndex + speed, currentTarget.length);
      setDisplayText(currentTarget.slice(0, nextIndex));
      currentIndexRef.current = nextIndex;
    }, interval);
  }, [disabled, targetText, speed, interval, onComplete]);

  const stopTyping = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsTyping(false);
    setDisplayText(targetTextRef.current);
  }, []);

  const resetTyping = useCallback(() => {
    stopTyping();
    currentIndexRef.current = 0;
    setDisplayText('');
  }, [stopTyping]);

  // Start typing when target text changes
  useEffect(() => {
    if (targetText && targetText.length > 0) {
      startTyping();
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [targetText, startTyping]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    displayText,
    isTyping,
    progress:
      targetText.length > 0 ? displayText.length / targetText.length : 0,
    startTyping,
    stopTyping,
    resetTyping,
  };
};
