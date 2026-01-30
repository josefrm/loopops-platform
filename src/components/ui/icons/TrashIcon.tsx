import React from 'react';

interface TrashIconProps {
  width?: number;
  height?: number;
  className?: string;
  fill?: string;
}

export const TrashIcon: React.FC<TrashIconProps> = ({
  width = 24,
  height = 24,
  className = '',
  fill = '#BE47B4',
}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
    >
      <g clipPath="url(#clip0_1195_19686)">
        <path
          d="M6 19C6 20.1 6.9 21 8 21H16C17.1 21 18 20.1 18 19V9C18 7.9 17.1 7 16 7H8C6.9 7 6 7.9 6 9V19ZM9 9H15C15.55 9 16 9.45 16 10V18C16 18.55 15.55 19 15 19H9C8.45 19 8 18.55 8 18V10C8 9.45 8.45 9 9 9ZM15.5 4L14.79 3.29C14.61 3.11 14.35 3 14.09 3H9.91C9.65 3 9.39 3.11 9.21 3.29L8.5 4H6C5.45 4 5 4.45 5 5C5 5.55 5.45 6 6 6H18C18.55 6 19 5.55 19 5C19 4.45 18.55 4 18 4H15.5Z"
          fill={fill}
        />
      </g>
      <defs>
        <clipPath id="clip0_1195_19686">
          <rect width="24" height="24" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
};

interface TrashIcon2Props {
  width?: number;
  height?: number;
  className?: string;
  fill?: string;
}

export const TrashIcon2: React.FC<TrashIcon2Props> = ({
  width = 14,
  height = 18,
  className = '',
  fill = 'currentColor',
}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox="0 0 14 18"
      fill="none"
      className={className}
    >
      <path
        d="M1 16C1 17.1 1.9 18 3 18H11C12.1 18 13 17.1 13 16V6C13 4.9 12.1 4 11 4H3C1.9 4 1 4.9 1 6V16ZM13 1H10.5L9.79 0.29C9.61 0.11 9.35 0 9.09 0H4.91C4.65 0 4.39 0.11 4.21 0.29L3.5 1H1C0.45 1 0 1.45 0 2C0 2.55 0.45 3 1 3H13C13.55 3 14 2.55 14 2C14 1.45 13.55 1 13 1Z"
        fill={fill}
      />
    </svg>
  );
};
