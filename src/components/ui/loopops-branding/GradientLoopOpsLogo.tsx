import React, { useId } from 'react';

interface GradientLoopOpsLogoProps {
  width?: number;
  height?: number;
  className?: string;
}

export const GradientLoopOpsLogo: React.FC<GradientLoopOpsLogoProps> = ({
  width = 24,
  height = 24,
  className = '',
}) => {
  // Generate unique IDs to prevent conflicts when multiple instances are rendered
  const uniqueId = useId();
  const gradientId = `paint0_linear_${uniqueId}`;
  const clipPathId = `clip0_${uniqueId}`;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
    >
      <g clipPath={`url(#${clipPathId})`}>
        <path
          d="M19.7062 7.18105C17.8312 6.61855 15.9 7.14355 14.6531 8.39043L12 10.7436L10.575 11.9998H10.5844L8.0625 14.2404C7.30313 14.9998 6.23438 15.3186 5.1375 15.1029C3.96562 14.8686 3 13.9311 2.72812 12.7686C2.24062 10.6779 3.81562 8.83105 5.8125 8.83105C6.66563 8.83105 7.4625 9.15918 8.1 9.79668L8.54063 10.1811C8.89688 10.4998 9.43125 10.4998 9.7875 10.1811C10.2094 9.80606 10.2094 9.14981 9.7875 8.77481L9.39375 8.4373C8.4375 7.48105 7.1625 6.95605 5.8125 6.95605C3.01875 6.95605 0.75 9.22481 0.75 11.9998C0.75 14.7748 3.01875 17.0436 5.8125 17.0436C7.1625 17.0436 8.4375 16.5186 9.34688 15.6092L12 13.2654L12.0094 13.2748L13.425 11.9998H13.4156L15.9375 9.75918C16.6969 8.9998 17.7656 8.68105 18.8625 8.89668C20.0344 9.13105 21 10.0686 21.2719 11.2311C21.7594 13.3217 20.1844 15.1686 18.1875 15.1686C17.3438 15.1686 16.5375 14.8404 15.9 14.2029L15.45 13.8092C15.0938 13.4904 14.5594 13.4904 14.2031 13.8092C13.7812 14.1842 13.7812 14.8404 14.2031 15.2154L14.5969 15.5623C15.5531 16.5092 16.8188 17.0342 18.1781 17.0342C21.2437 17.0342 23.6719 14.3154 23.175 11.1748C22.8937 9.30918 21.5156 7.71543 19.7062 7.18105Z"
          fill={`url(#${gradientId})`}
        />
      </g>
      <defs>
        <linearGradient
          id={gradientId}
          x1="0.75"
          y1="7.07793"
          x2="23.25"
          y2="7.07793"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#FFC842" />
          <stop offset="0.254808" stopColor="#FF7CA3" />
          <stop offset="0.490385" stopColor="#DF86FF" />
          <stop offset="0.759615" stopColor="#75FFA2" />
          <stop offset="1" stopColor="#48ECFF" />
        </linearGradient>
        <clipPath id={clipPathId}>
          <rect
            width="22.5"
            height="22.5"
            fill="white"
            transform="translate(0.75 0.75)"
          />
        </clipPath>
      </defs>
    </svg>
  );
};
