import { useEffect, useState, useCallback, useRef } from 'react';

/**
 * Hook para detectar cuando el tab del navegador está visible/oculto
 * y ejecutar callbacks cuando cambia la visibilidad
 */
export function usePageVisibility(
  onVisible?: () => void,
  onHidden?: () => void,
) {
  const [isVisible, setIsVisible] = useState(!document.hidden);
  const onVisibleRef = useRef(onVisible);
  const onHiddenRef = useRef(onHidden);
  const lastVisibilityChangeRef = useRef(Date.now());

  // Actualizar refs cuando cambien los callbacks
  useEffect(() => {
    onVisibleRef.current = onVisible;
    onHiddenRef.current = onHidden;
  }, [onVisible, onHidden]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      const now = Date.now();
      const timeSinceLastChange = now - lastVisibilityChangeRef.current;
      lastVisibilityChangeRef.current = now;

      const currentlyVisible = !document.hidden;
      setIsVisible(currentlyVisible);

      console.log(
        `[PageVisibility] Tab ${currentlyVisible ? 'visible' : 'hidden'} (inactive for ${Math.round(timeSinceLastChange / 1000)}s)`,
      );

      if (currentlyVisible) {
        onVisibleRef.current?.();
      } else {
        onHiddenRef.current?.();
      }
    };

    // Registrar listener
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const getTimeSinceLastChange = useCallback(() => {
    return Date.now() - lastVisibilityChangeRef.current;
  }, []);

  return {
    isVisible,
    getTimeSinceLastChange,
  };
}
