import React from 'react';

/**
 * Reusable table header component for review files tables
 * Uses viewport width percentages for responsive column sizing
 */
export const TableHeader: React.FC = () => {
  return (
    <div className="flex text-md font-bold text-neutral-grayscale-90 space-x-loop-2">
      <div className="flex-1 min-w-[12vw]">File</div>
      <div className="w-[12vw]">Category</div>
      <div className="w-[12vw]">Project</div>
      <div className="w-[11vw] text-left">Summary and keywords</div>
      <div className="w-[8vw] text-left">Share with workspace</div>
      <div className="w-[3vw]">Delete</div>
    </div>
  );
};
