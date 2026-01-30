import { cn } from '@/lib/utils';
import React, { useCallback, useEffect, useState } from 'react';

export type CurtainDirection = 'left-to-right' | 'right-to-left';

interface CurtainTransitionProps {
  isActive: boolean;
  direction: CurtainDirection;
  onAnimationComplete?: () => void;
  onMidpoint?: () => void; // Called when curtain reaches midpoint (good time to change route)
  duration?: number; // Total animation duration in ms
  className?: string;
}

/**
 * CurtainTransition - A full-screen overlay that slides across like pulling a curtain
 *
 * The animation has two phases:
 * 1. "Pull" phase - curtain slides to cover the screen
 * 2. "Reveal" phase - curtain continues past and reveals the new content
 *
 * The `onMidpoint` callback fires when the curtain fully covers the screen,
 * which is the ideal moment to change the route.
 */
export const CurtainTransition: React.FC<CurtainTransitionProps> = ({
  isActive,
  direction,
  onAnimationComplete,
  onMidpoint,
  duration = 800,
  className,
}) => {
  const [phase, setPhase] = useState<'idle' | 'pulling' | 'revealing'>('idle');

  useEffect(() => {
    if (!isActive) {
      setPhase('idle');
      return;
    }

    // Start pulling
    setPhase('pulling');

    // At midpoint, trigger the route change
    const midpointTimer = setTimeout(() => {
      onMidpoint?.();
      setPhase('revealing');
    }, duration / 2);

    // Animation complete
    const completeTimer = setTimeout(() => {
      setPhase('idle');
      onAnimationComplete?.();
    }, duration);

    return () => {
      clearTimeout(midpointTimer);
      clearTimeout(completeTimer);
    };
  }, [isActive, duration, onMidpoint, onAnimationComplete]);

  if (!isActive && phase === 'idle') {
    return null;
  }

  const isLeftToRight = direction === 'left-to-right';

  // Calculate transform based on phase and direction
  const getTransform = () => {
    if (phase === 'idle') {
      return isLeftToRight ? 'translateX(-100%)' : 'translateX(100%)';
    }
    if (phase === 'pulling') {
      return 'translateX(0%)';
    }
    // revealing
    return isLeftToRight ? 'translateX(100%)' : 'translateX(-100%)';
  };

  return (
    <div
      className={cn(
        'fixed inset-0 z-[100] pointer-events-none',
        phase !== 'idle' && 'pointer-events-auto',
      )}
    >
      {/* The curtain itself */}
      <div
        className={cn(
          'absolute inset-0 bg-gradient-to-r from-white via-brand-accent-0 to-white',
          'flex items-center justify-center',
          'transition-transform ease-[cubic-bezier(0.4,0,0.2,1)]',
          className,
        )}
        style={{
          transform: getTransform(),
          transitionDuration: `${duration / 2}ms`,
        }}
      >
        {/* Curtain content - Logo or loading indicator */}
        <div className="flex flex-col items-center gap-4">
          <img
            src="/lovable-uploads/loop_ops_small.png"
            alt="LoopOps"
            className={cn('w-16 h-16 object-contain', 'animate-pulse')}
          />
          {/* Optional: subtle loading bar */}
          {/* <div className="w-32 h-1 bg-brand-accent-20 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-accent-50 rounded-full"
              style={{
                animation:
                  phase === 'pulling'
                    ? `curtainProgress ${duration / 2}ms ease-out forwards`
                    : 'none',
                width: phase === 'revealing' ? '100%' : '0%',
              }}
            />
          </div> */}
        </div>
      </div>

      {/* Add keyframes via style tag */}
      <style>{`
        @keyframes curtainProgress {
          from { width: 0%; }
          to { width: 100%; }
        }
      `}</style>
    </div>
  );
};

// ============================================================================
// Curtain Transition Context - For triggering curtain from anywhere
// ============================================================================

interface CurtainTransitionContextValue {
  triggerCurtain: (
    direction: CurtainDirection,
    onMidpoint: () => void,
    onComplete?: () => void,
  ) => void;
  isAnimating: boolean;
}

const CurtainTransitionContext =
  React.createContext<CurtainTransitionContextValue | null>(null);

export const useCurtainTransition = () => {
  const context = React.useContext(CurtainTransitionContext);
  if (!context) {
    throw new Error(
      'useCurtainTransition must be used within CurtainTransitionProvider',
    );
  }
  return context;
};

interface CurtainTransitionProviderProps {
  children: React.ReactNode;
  duration?: number;
}

export const CurtainTransitionProvider: React.FC<
  CurtainTransitionProviderProps
> = ({ children }) => {
  // We are bypassing the curtain animation but keeping the context structure
  // so that consumers don't need to change their code.

  const triggerCurtain = useCallback(
    (
      _dir: CurtainDirection,
      onMidpoint: () => void,
      onComplete?: () => void,
    ) => {
      // Execute callbacks immediately to simulate "instant" transition
      onMidpoint();
      if (onComplete) {
        onComplete();
      }
    },
    [],
  );

  const value: CurtainTransitionContextValue = {
    triggerCurtain,
    isAnimating: false, // Always false since we aren't animating
  };

  return (
    <CurtainTransitionContext.Provider value={value}>
      {children}
      {/* CurtainTransition component is removed so no overlay is rendered */}
    </CurtainTransitionContext.Provider>
  );
};
