import React from 'react';

interface LoopOpsIconProps {
  width?: number;
  height?: number;
  className?: string;
  fill?: string;
}

export const LoopOpsIcon: React.FC<LoopOpsIconProps> = ({
  width,
  height,
  className = '',
  fill = 'currentColor',
}) => {
  const displayWidth = width ?? 16;
  const displayHeight = height ?? width ?? 16;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={displayWidth}
      height={displayHeight}
      viewBox="0 0 16 16"
      fill="none"
      className={className}
    >
      <g clipPath="url(#clip0_653_892)">
        <path
          d="M13.48 4.57333C12.1467 4.17333 10.7733 4.54666 9.88667 5.43333L8 7.10666L6.98667 8H6.99333L5.2 9.59333C4.66 10.1333 3.9 10.36 3.12 10.2067C2.28667 10.04 1.6 9.37333 1.40667 8.54666C1.06 7.06 2.18 5.74666 3.6 5.74666C4.20667 5.74666 4.77333 5.98 5.22667 6.43333L5.54 6.70666C5.79333 6.93333 6.17333 6.93333 6.42667 6.70666C6.72667 6.44 6.72667 5.97333 6.42667 5.70666L6.14667 5.46666C5.46667 4.78666 4.56 4.41333 3.6 4.41333C1.61333 4.41333 0 6.02666 0 8C0 9.97333 1.61333 11.5867 3.6 11.5867C4.56 11.5867 5.46667 11.2133 6.11333 10.5667L8 8.9L8.00667 8.90666L9.01333 8H9.00667L10.8 6.40666C11.34 5.86666 12.1 5.64 12.88 5.79333C13.7133 5.96 14.4 6.62666 14.5933 7.45333C14.94 8.94 13.82 10.2533 12.4 10.2533C11.8 10.2533 11.2267 10.02 10.7733 9.56666L10.4533 9.28666C10.2 9.06 9.82 9.06 9.56667 9.28666C9.26667 9.55333 9.26667 10.02 9.56667 10.2867L9.84667 10.5333C10.5267 11.2067 11.4267 11.58 12.3933 11.58C14.5733 11.58 16.3 9.64666 15.9467 7.41333C15.7467 6.08666 14.7667 4.95333 13.48 4.57333Z"
          fill={fill}
        />
      </g>
      <defs>
        <clipPath id="clip0_653_892">
          <rect width="16" height="16" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
};
