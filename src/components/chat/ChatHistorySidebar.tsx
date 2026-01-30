import { MessageSquare } from 'lucide-react';
import React from 'react';

export const ChatHistorySidebar: React.FC = () => {
  return (
    <div className="h-full flex flex-col border-none">
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center py-8">
          <MessageSquare className="w-12 h-loop-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500">Chat history disabled</p>
          <p className="text-xs text-slate-400 mt-1">
            All conversations are managed through backend sessions
          </p>
        </div>
      </div>
    </div>
  );
};
