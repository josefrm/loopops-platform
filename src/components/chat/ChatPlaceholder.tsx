import React from 'react';

export const ChatPlaceholder: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center w-full mb-0 space-y-loop-1">
      <div
        className="w-full flex items-center justify-center font-sans not-italic"
        style={{
          textAlign: 'center',
          fontSize: '20px',
          fontStyle: 'normal',
          fontWeight: '700',
          lineHeight: 'normal',
          letterSpacing: '-0.6px',
        }}
      >
        Product Team is ready...
      </div>
      <div
        className="w-[400px] flex items-center justify-center"
        style={{
          color: '#666',
          textAlign: 'center',
          fontFamily: 'Inter, sans-serif',
          fontSize: 18,
          fontStyle: 'normal',
          fontWeight: 400,
          lineHeight: 'normal',
        }}
      >
        To start a Loop, add a ticket, or pick a goal.
      </div>
    </div>
  );
};
