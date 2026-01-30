import React from 'react';

interface LoopOpsLogoProps {
  width?: number;
  height?: number;
  className?: string;
  fill?: string;
  fillOpacity?: number;
}

export const LoopOpsLogo: React.FC<LoopOpsLogoProps> = ({
  width = 24,
  height = 24,
  className = '',
  fill = 'currentColor',
  fillOpacity = 1,
}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: `${width}px`, height: `${height}px` }}
      viewBox="-100 -150 1650 850"
      fill="none"
      className={className}
    >
      <path
        d="M1184.08 -90.2684C1037.06 -77.2074 901.47 45.7097 804.783 147.944L786.269 165.693C647.978 17.1901 472.907 -137.825 253.642 -79.3544C-68.3739 6.56231 -85.9307 487.71 213.315 616.209C418.428 704.273 588.853 568.402 748.708 413.566C747.573 412.6 746.97 412.063 746.97 412.063L911.472 253.542C958.113 196.395 1080.62 90.1173 1145.92 68.1461C1426.4 -26.2871 1533.23 384.689 1298.86 480.231C1139.18 545.322 1008.23 407.59 906.364 300.955C875.046 335.343 882.884 423.908 916.615 502.059C990.992 571.981 1073.35 633.994 1171.84 641.974C1709.44 685.487 1691.92 -135.249 1184.08 -90.1969V-90.2684ZM447.654 478.621C173.413 583.789 37.4988 184.014 266.34 74.8734C433.502 -4.8527 595.379 168.34 700.188 272.364C700.188 272.364 523.556 449.493 447.618 478.621H447.654Z"
        fill={fill}
        fillOpacity={fillOpacity}
      />
    </svg>
  );
};
