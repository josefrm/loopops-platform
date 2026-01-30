import React from 'react';

export interface InformationTileAction {
  id: string;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  className?: string;
}

interface InformationTileProps {
  // First column (left-most icon/content)
  leadingContent?: React.ReactNode;

  // Second column main content (flexible content area)
  children: React.ReactNode;

  // Third column actions (customizable actions)
  actions?: InformationTileAction[];

  // Container props
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
  isActive?: boolean;

  // Layout customization
  width?: string | number;
  height?: string | number;
  showDividers?: boolean;
  dividerColor?: string;
}

export const InformationTile: React.FC<InformationTileProps> = ({
  leadingContent,
  children,
  actions = [],
  className = '',
  style,
  onClick,
  isActive = false,
  width = '100%',
  height = 'auto',
  showDividers = true,
  dividerColor = 'bg-neutral-grayscale-30',
}) => {
  const activeTileStyles = `bg-brand-deliverable-0 border-brand-deliverable-50`;
  const defaultTileStyles = `bg-neutral-grayscale-0 border-neutral-grayscale-30`;

  const tileStyles = isActive ? activeTileStyles : defaultTileStyles;

  const containerClasses = `
    flex p-loop-4 flex-col items-start gap-loop-2 self-stretch 
    rounded-sm border ${tileStyles}
    relative overflow-hidden
    ${
      onClick
        ? 'cursor-pointer hover:border-brand-accent-50 transition-colors'
        : ''
    }
    ${className}
  `;

  return (
    <div
      className={containerClasses}
      style={{
        width,
        minHeight: '64px',
        height: height === 'auto' ? 'auto' : height,
        ...style,
      }}
      onClick={onClick}
    >
      <div className="flex items-start justify-between w-full min-h-[56px] relative overflow-hidden">
        {/* 1st Column: Leading Content (customizable) */}
        {leadingContent && (
          <>
            <div className="flex items-center justify-center flex-shrink-0 self-center">
              {leadingContent}
            </div>

            {/* Divider 1 */}
            {showDividers && (
              <div
                className={`w-px ${dividerColor} mx-loop-4 self-stretch`}
              ></div>
            )}
          </>
        )}

        {/* 2nd Column: Main Content (flexible content area) */}
        <div className="flex items-start flex-1 py-loop-2 min-w-0 overflow-hidden">
          {children}
        </div>

        {/* Divider 2 */}
        {actions.length > 0 && showDividers && (
          <div className={`w-px ${dividerColor} mx-loop-4 self-stretch`}></div>
        )}

        {/* 3rd Column: Actions (customizable actions) */}
        {actions.length > 0 && (
          <div className="flex items-center gap-loop-1 relative z-10 self-center">
            {actions.map((action) => (
              <div
                key={action.id}
                className={`
                  w-loop-8 h-loop-8 rounded-full bg-neutral-grayscale-20 
                  flex items-center justify-center cursor-pointer 
                  hover:bg-neutral-grayscale-30 transition-colors
                  hover:z-[10000] relative
                  ${action.className || ''}
                `}
                onClick={(e) => {
                  e.stopPropagation(); // Prevent tile click when clicking action
                  action.onClick();
                }}
                title={action.label}
              >
                {action.icon}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
