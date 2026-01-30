import React from 'react';

interface MicrophoneIconProps {
  width?: number;
  height?: number;
  className?: string;
  fill?: string;
}

export const MicrophoneIcon: React.FC<MicrophoneIconProps> = ({
  width = 14,
  height = 19,
  className = '',
  fill = 'currentColor',
}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox="0 0 14 19"
      fill="none"
      className={className}
    >
      <path
        d="M6.99999 12C8.65999 12 9.99999 10.66 9.99999 9V3C9.99999 1.34 8.65999 0 6.99999 0C5.33999 0 3.99999 1.34 3.99999 3V9C3.99999 10.66 5.33999 12 6.99999 12ZM12.91 9C12.42 9 12.01 9.36 11.93 9.85C11.52 12.2 9.46999 14 6.99999 14C4.52999 14 2.47999 12.2 2.06999 9.85C1.98999 9.36 1.57999 9 1.08999 9C0.479987 9 -1.35005e-05 9.54 0.0899865 10.14C0.579987 13.14 2.97999 15.49 5.99999 15.92V18C5.99999 18.55 6.44999 19 6.99999 19C7.54999 19 7.99999 18.55 7.99999 18V15.92C11.02 15.49 13.42 13.14 13.91 10.14C14.01 9.54 13.52 9 12.91 9Z"
        fill={fill}
      />
    </svg>
  );
};
