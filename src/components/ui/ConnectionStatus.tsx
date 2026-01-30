import React from 'react';

type ConnectionStatusType = 'checking' | 'connected' | 'notConnected';

interface ConnectionStatusProps {
  status: ConnectionStatusType;
  className?: string;
}

const statusConfig = {
  checking: { color: '#FFD600', label: 'Checking...' }, // yellow
  connected: { color: '#45B36B', label: 'Connected' }, // green
  notConnected: { color: '#A0AEC0', label: 'Not Connected' }, // gray
};

const StatusCircle: React.FC<{ color: string }> = ({ color }) => (
  <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
    <circle cx="4" cy="4" r="4" fill={color} />
  </svg>
);

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  status,
  className = '',
}) => {
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <StatusCircle color={statusConfig[status].color} />
    </div>
  );
};

// Export the type for use in other components
export type { ConnectionStatusType };
