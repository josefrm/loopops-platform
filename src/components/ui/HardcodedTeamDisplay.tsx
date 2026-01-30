import React, { useEffect } from 'react';

interface HardcodedTeamDisplayProps {
  onTeamSelect: (teamId: string) => void;
  className?: string;
  chatTitle?: string;
  variant?: 'default' | 'dark' | 'navigation';
}

const HARDCODED_TEAM = {
  id: 'discovery-and-define',
  name: 'Discovery and Define',
};

export const HardcodedTeamDisplay: React.FC<HardcodedTeamDisplayProps> = ({
  onTeamSelect,
  className = '',
  chatTitle = 'Umvel',
  variant = 'navigation',
}) => {
  // Auto-select the hardcoded team on mount
  useEffect(() => {
    onTeamSelect(HARDCODED_TEAM.id);
  }, [onTeamSelect]);

  // Define styles based on variant
  const textColorClass =
    variant === 'navigation'
      ? 'text-brand-accent-50 font-bold tracking-[-0.48px]'
      : variant === 'dark'
      ? 'text-neutral-grayscale-30'
      : 'text-neutral-grayscale-50';

  return (
    <div className={className}>
      <span className={textColorClass}>
        {chatTitle} / {HARDCODED_TEAM.name}
      </span>
    </div>
  );
};
