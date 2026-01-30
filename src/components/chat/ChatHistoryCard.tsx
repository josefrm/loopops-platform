import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import React from 'react';
import { TrashIcon } from '../ui/icons/TrashIcon';

interface ChatHistoryCardProps {
  chat: {
    id: string;
    title: string;
    updated_at: string;
    message_count: number;
    messages: Array<{
      content: string;
    }>;
  };
  selectedChatId?: string;
  loadingChatId: string | null;
  onSelectChat: (chat: any) => void;
  onDeleteChat: (e: React.MouseEvent, chatId: string) => void;
}

export const ChatHistoryCard: React.FC<ChatHistoryCardProps> = ({
  chat,
  selectedChatId,
  loadingChatId,
  onSelectChat,
  onDeleteChat,
}) => {
  return (
    <div
      className={`w-full relative p-loop-4 space-y-loop-1 !mb-loop-8  cursor-pointer transition-all duration-200 hover:shadow-md max-w-[280px] max-h-[185px] rounded-[16px] bg-neutral-grayscale-20 border-none ${
        selectedChatId === chat.id ? 'ring-2 ring-brand-accent-50' : ''
      } ${loadingChatId === chat.id ? 'opacity-50' : ''}`}
      onClick={() => onSelectChat(chat)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelectChat(chat);
        }
      }}
    >
      {/* Speech bubble triangle */}
      {selectedChatId !== chat.id && (
        <div
          className="absolute bottom-[-16px] left-[0px] w-0 h-0"
          style={{
            borderLeft: '0px solid transparent',
            borderRight: '50px solid transparent',
            borderTop: '24px solid #EEEEEE', // custom-gray-400 color
          }}
        />
      )}

      <div className="">
        <div className="flex items-start justify-between">
          <div
            className="text-sm font-medium truncate flex-1 font-sans not-italic"
            style={{
              color: '#333',
              fontSize: '12px',
              fontStyle: 'normal',
              fontWeight: 400,
              lineHeight: 'normal',
              letterSpacing: '-0.36px',
            }}
          >
            {/* Chat •{' '} */}
            {formatDistanceToNow(new Date(chat.updated_at), {
              addSuffix: true,
            })}
          </div>
        </div>
        <h4
          className="text-lg line-clamp-2 leading-relaxed font-sans not-italic"
          style={{
            color: 'var(--Gray-4, #333)',
            fontSize: '14px',
            fontStyle: 'normal',
            fontWeight: 700,
            lineHeight: 'normal',
            maxWidth: '173px',
          }}
        >
          {chat.title}
        </h4>
      </div>

      <div className="">
        {chat.messages.length > 0 && (
          <div className="text-xs text-slate-600">
            <p className="line-clamp-2">
              {chat.messages[0]?.content?.substring(0, 100)}...
            </p>
          </div>
        )}

        <div className="flex flex-wrap pt-loop-2 space-x-loop-1">
          <Badge
            variant="outline"
            className={`h-loop-5 text-md p-loop-2 font-normal text-neutral-grayscale-50 bg-white border-none`}
          >
            # tickets
          </Badge>
          <Badge
            variant="outline"
            className="h-loop-5 text-md p-loop-2 font-normal text-neutral-grayscale-50 bg-white border-none"
          >
            {loadingChatId === chat.id
              ? 'Loading...'
              : `${chat.message_count} messages`}
          </Badge>
        </div>
      </div>

      <div
        className="absolute right-[16px] top-[16px] text-slate-400 hover:bg-none hover:bg-accent-none p-0 !mt-0"
        onClick={(e) => {
          e.stopPropagation(); // Prevent card click
          onDeleteChat(e, chat.id);
        }}
        // disabled={deletingId === chat.id || loadingChatId === chat.id}
      >
        <TrashIcon className="hover:text-red-500" width={24} height={24} />
      </div>
    </div>
  );
};
