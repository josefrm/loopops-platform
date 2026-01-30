import { ControlButton } from '@/components/ui/ControlButton';
import React, { useEffect, useState } from 'react';
import { CircleControlIcon } from '../ui/CircleControlIcon';

// Utility function to get element position
const getElementPosition = (element: HTMLElement) => {
  // Use viewport-relative coordinates (getBoundingClientRect) so
  // `position: fixed` placements follow the element correctly when
  // the viewport changes (resizes/scroll) and when elements resize.
  const rect = element.getBoundingClientRect();
  return {
    top: rect.top,
    left: rect.left,
    bottom: rect.bottom,
    right: rect.right,
    width: rect.width,
    height: rect.height,
  };
};

// Type definition for button actions
export interface WalkthroughButton {
  title: string;
  action: () => void;
}

// Type definition for icon section
export interface WalkthroughIconSection {
  icon: React.ReactNode;
  text: string;
  action: () => void;
}

// Type definition for positioning
export interface WalkthroughPosition {
  top?: number | string;
  left?: number | string;
  right?: number | string;
  bottom?: number | string;
}

interface WalkthroughInfoProps {
  title: string;
  description: string;
  primaryButton?: WalkthroughButton;
  secondaryButton?: WalkthroughButton;
  iconSection?: WalkthroughIconSection;
  position?: WalkthroughPosition;
  targetRef?: React.RefObject<HTMLElement>; // New prop for target element
  offset?: { x?: number; y?: number }; // Optional offset from target
  placement?:
    | 'top'
    | 'bottom'
    | 'left'
    | 'right'
    | 'top-left'
    | 'top-right'
    | 'bottom-left'
    | 'bottom-right'
    | 'top-start'
    | 'bottom-start'
    | 'left-start'
    | 'right-start'
    | 'inside-top-left-corner';
  centered?: boolean;
  className?: string;
  animation?: 'bounce' | 'pulse' | 'jump' | 'none';
  trigger?: any;
}

export const WalkthroughInfo: React.FC<WalkthroughInfoProps> = ({
  title,
  description,
  primaryButton,
  secondaryButton,
  iconSection,
  position,
  targetRef,
  offset = { x: 0, y: 0 },
  placement = 'bottom-right',
  centered = false,
  className = '',
  animation = 'none',
  trigger,
}) => {
  const [calculatedPosition, setCalculatedPosition] =
    useState<React.CSSProperties>({});

  // Calculate position based on target ref and keep it updated while the target changes
  useEffect(() => {
    let rafId: number | null = null;

    const calculatePosition = () => {
      if (targetRef?.current) {
        const targetPos = getElementPosition(targetRef.current);
        const newPosition: React.CSSProperties = {
          position: 'fixed',
          zIndex: 1000,
        };

        switch (placement) {
          case 'bottom':
            newPosition.top = targetPos.bottom + (offset.y || 0);
            newPosition.left =
              targetPos.left + targetPos.width / 2 - 200 + (offset.x || 0); // Center horizontally (400px / 2 = 200px)
            break;
          case 'bottom-start':
            newPosition.top = targetPos.bottom + (offset.y || 0);
            newPosition.left = targetPos.left + (offset.x || 0); // Align to start (left edge)
            break;
          case 'bottom-right':
            newPosition.top = targetPos.bottom + (offset.y || 0);
            newPosition.left = targetPos.right + (offset.x || 0);
            break;
          case 'bottom-left':
            newPosition.top = targetPos.bottom + (offset.y || 0);
            newPosition.right =
              window.innerWidth - targetPos.left + (offset.x || 0);
            break;
          case 'top':
            newPosition.bottom =
              window.innerHeight - targetPos.top + (offset.y || 0);
            newPosition.left =
              targetPos.left + targetPos.width / 2 - 200 + (offset.x || 0);
            break;
          case 'top-start':
            newPosition.bottom =
              window.innerHeight - targetPos.top + (offset.y || 0);
            newPosition.left = targetPos.left + (offset.x || 0); // Align to start (left edge)
            break;
          case 'top-right':
            newPosition.bottom =
              window.innerHeight - targetPos.top + (offset.y || 0);
            newPosition.left = targetPos.right + (offset.x || 0);
            break;
          case 'top-left':
            newPosition.bottom =
              window.innerHeight - targetPos.top + (offset.y || 0);
            newPosition.right =
              window.innerWidth - targetPos.left + (offset.x || 0);
            break;
          case 'left':
            newPosition.top =
              targetPos.top + targetPos.height / 2 - 100 + (offset.y || 0); // Rough center vertically
            newPosition.right =
              window.innerWidth - targetPos.left + (offset.x || 0);
            break;
          case 'left-start':
            newPosition.top = targetPos.top + (offset.y || 0); // Align to start (top edge)
            newPosition.right =
              window.innerWidth - targetPos.left + (offset.x || 0);
            break;
          case 'right':
            newPosition.top =
              targetPos.top + targetPos.height / 2 - 100 + (offset.y || 0);
            newPosition.left = targetPos.right + (offset.x || 0);
            break;
          case 'right-start':
            newPosition.top = targetPos.top + (offset.y || 0); // Align to start (top edge)
            newPosition.left = targetPos.right + (offset.x || 0);
            break;
          case 'inside-top-left-corner':
            // Position the walkthrough info inside the target element, at its top-left corner
            newPosition.top = targetPos.top + (offset.y || 0);
            newPosition.left = targetPos.left + (offset.x || 0);
            // Ensure it's fixed and above content
            newPosition.position = 'fixed';
            newPosition.zIndex = 1000;
            break;
        }

        // Only update state if position has actually changed to prevent infinite loops
        // Compare stringified objects to detect any changes in position values
        setCalculatedPosition((prevPosition) => {
          const prevStr = JSON.stringify(prevPosition);
          const newStr = JSON.stringify(newPosition);
          return prevStr === newStr ? prevPosition : newPosition;
        });
      }
    };

    const scheduleCalc = () => {
      if (rafId != null) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(calculatePosition);
    };

    if (targetRef?.current) {
      // Immediate calculation and continuous tracking
      calculatePosition();

      // Observe size changes of the target
      const ro = new ResizeObserver(scheduleCalc);
      ro.observe(targetRef.current);

      // MutationObserver to detect DOM/attribute changes that move the target
      // (useful when the element's position changes without its size changing)
      const mo = new MutationObserver(scheduleCalc);
      if (document.body) {
        mo.observe(document.body, {
          subtree: true,
          attributes: true,
          childList: true,
        });
      }

      // Recalculate on window resize and scroll (capture to catch scrolling ancestors)
      window.addEventListener('resize', scheduleCalc);
      window.addEventListener('scroll', scheduleCalc, true);

      // Also listen for CSS transitions that may move elements
      const transitionHandler = scheduleCalc;
      document.addEventListener('transitionrun', transitionHandler, true);
      document.addEventListener('transitionend', transitionHandler, true);

      return () => {
        ro.disconnect();
        mo.disconnect();
        window.removeEventListener('resize', scheduleCalc);
        window.removeEventListener('scroll', scheduleCalc, true);
        document.removeEventListener('transitionrun', transitionHandler, true);
        document.removeEventListener('transitionend', transitionHandler, true);
        if (rafId != null) cancelAnimationFrame(rafId);
      };
    } else {
      // If targetRef is not ready, retry after a short delay
      const retryTimer = setTimeout(() => {
        scheduleCalc();
      }, 100);

      return () => clearTimeout(retryTimer);
    }
  }, [targetRef, offset, placement, trigger]); // Position calculation only depends on target element position
  // Determine if we have buttons to show
  const hasButtons = primaryButton || secondaryButton;
  const hasTwoButtons = primaryButton && secondaryButton;

  // Animation classes
  const getAnimationClass = (animationType: string) => {
    switch (animationType) {
      case 'bounce':
        return 'animate-bounce';
      case 'pulse':
        return 'animate-pulse';
      case 'jump':
        return 'walkthrough-jump';
      default:
        return '';
    }
  };

  // Add custom CSS for jump animation
  React.useEffect(() => {
    if (animation === 'jump') {
      const style = document.createElement('style');
      style.textContent = `
        @keyframes walkthrough-jump {
          0%, 20%, 50%, 80%, 100% {
            transform: translateY(0);
          }
          40% {
            transform: translateY(-10px);
          }
          60% {
            transform: translateY(-5px);
          }
        }
        .walkthrough-jump {
          animation: walkthrough-jump 2s ease-in-out infinite;
        }
      `;
      document.head.appendChild(style);
      return () => {
        if (document.head.contains(style)) {
          document.head.removeChild(style);
        }
      };
    }
  }, [animation]);

  // Generate positioning styles
  const positioningStyles: React.CSSProperties = {};

  if (targetRef?.current && Object.keys(calculatedPosition).length > 0) {
    // Use calculated position from target ref
    Object.assign(positioningStyles, calculatedPosition);
  } else if (
    targetRef?.current &&
    Object.keys(calculatedPosition).length === 0
  ) {
    // If we have a target ref but no calculated position yet, force a default position near the target
    // to avoid centering while waiting for calculation
    const targetElement = targetRef.current;
    const rect = targetElement.getBoundingClientRect();
    positioningStyles.position = 'fixed';
    positioningStyles.zIndex = 1000;

    switch (placement) {
      case 'bottom':
      case 'bottom-start':
        positioningStyles.top = rect.bottom + (offset.y || 0);
        positioningStyles.left = rect.left + (offset.x || 0);
        break;
      case 'top':
      case 'top-start':
        positioningStyles.bottom =
          window.innerHeight - rect.top + (offset.y || 0);
        positioningStyles.left = rect.left + (offset.x || 0);
        break;
      default:
        positioningStyles.top = rect.bottom + (offset.y || 0);
        positioningStyles.left = rect.left + (offset.x || 0);
        break;
    }
  } else if (centered) {
    // Center the component
    positioningStyles.position = 'fixed';
    positioningStyles.top = '50%';
    positioningStyles.left = '50%';
    positioningStyles.transform = 'translate(-50%, -50%)';
    positioningStyles.zIndex = 1000;
  } else if (position) {
    // Use custom positioning
    positioningStyles.position = 'fixed';
    positioningStyles.zIndex = 1000;

    if (position.top !== undefined) {
      positioningStyles.top =
        typeof position.top === 'number' ? `${position.top}px` : position.top;
    }
    if (position.left !== undefined) {
      positioningStyles.left =
        typeof position.left === 'number'
          ? `${position.left}px`
          : position.left;
    }
    if (position.right !== undefined) {
      positioningStyles.right =
        typeof position.right === 'number'
          ? `${position.right}px`
          : position.right;
    }
    if (position.bottom !== undefined) {
      positioningStyles.bottom =
        typeof position.bottom === 'number'
          ? `${position.bottom}px`
          : position.bottom;
    }
  } else {
    // Default positioning (relative)
    positioningStyles.minHeight = 'fit-content';
  }

  // Smooth movement: add transitions so position changes animate (smooth up/down)
  // and hint the browser for better compositing.
  positioningStyles.transition =
    'top 200ms cubic-bezier(0.2,0.8,0.2,1), left 200ms cubic-bezier(0.2,0.8,0.2,1), bottom 200ms cubic-bezier(0.2,0.8,0.2,1), right 200ms cubic-bezier(0.2,0.8,0.2,1)';
  positioningStyles.willChange = 'top, left, bottom, right, transform';

  return (
    <div
      className={`w-[400px] p-loop-8 bg-black/90 shadow-2xl rounded-lg ${getAnimationClass(
        animation,
      )} ${className}`}
      style={positioningStyles}
    >
      {/* Title */}
      <h3 className="text-brand-accent-20 text-lg font-bold mb-loop-4">
        {title}
      </h3>

      {/* Description */}
      <p className="text-neutral-grayscale-0 text-base mb-loop-6">
        {description}
      </p>

      {/* Optional Icon Section */}
      {iconSection && (
        <div className="text-neutral-grayscale-0 text-base mb-loop-6 flex items-center gap-loop-3">
          <div className="flex-shrink-0">
            <CircleControlIcon
              icon={iconSection.icon}
              size="md"
              type="gray_black"
              className="hover:bg-brand-accent-50 hover:text-neutral-grayscale-0 hover:border hover:border-brand-accent-50"
              onClick={iconSection.action}
            />
          </div>
          <p>{iconSection.text}</p>
        </div>
      )}

      {/* Buttons */}
      {hasButtons && (
        <div className="flex gap-loop-3 justify-center">
          {hasTwoButtons ? (
            <>
              {/* Secondary button (transparent) */}
              {secondaryButton && (
                <ControlButton
                  type="whiteInverse"
                  size="xl"
                  fontSize={12}
                  text={secondaryButton.title}
                  onClick={secondaryButton.action}
                />
              )}
              {/* Primary button (default) */}
              {primaryButton && (
                <ControlButton
                  type="defaultV2"
                  size="xl"
                  fontSize={12}
                  text={primaryButton.title}
                  onClick={primaryButton.action}
                />
              )}
            </>
          ) : (
            /* Single button (default) */
            (primaryButton || secondaryButton) && (
              <ControlButton
                type="defaultV2"
                size="xl"
                fontSize={12}
                text={(primaryButton || secondaryButton)!.title}
                onClick={(primaryButton || secondaryButton)!.action}
                className="!w-full"
              />
            )
          )}
        </div>
      )}
    </div>
  );
};
