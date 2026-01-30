import React from 'react';

interface MessageSkeletonProps {
  isUser?: boolean;
}

export const MessageSkeleton: React.FC<MessageSkeletonProps> = ({
  isUser = false,
}) => {
  return (
    <div className="animate-pulse">
      <div className="space-y-3">
        <div
          className={`h-3 ${
            isUser ? 'bg-slate-400' : 'bg-gray-300'
          } rounded w-4/5`}
        ></div>
        <div
          className={`h-3 ${
            isUser ? 'bg-slate-400' : 'bg-gray-300'
          } rounded w-3/5`}
        ></div>
        <div
          className={`h-3 ${
            isUser ? 'bg-slate-400' : 'bg-gray-300'
          } rounded w-5/6`}
        ></div>
        <div
          className={`h-3 ${
            isUser ? 'bg-slate-400' : 'bg-gray-300'
          } rounded w-2/3`}
        ></div>
      </div>
    </div>
  );
};
