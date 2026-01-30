import React from 'react';
import { GradientLoopOpsLogo } from '../ui/loopops-branding/GradientLoopOpsLogo';

interface MessageAvatarProps {
  isUser: boolean;
  userMetadata?: {
    avatar_url?: string;
    full_name?: string;
  };
  userEmail?: string;
}

export const MessageAvatar: React.FC<MessageAvatarProps> = ({
  isUser,
  userMetadata,
  userEmail,
}) => {
  const avatarClasses = `w-loop-8 h-loop-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs overflow-hidden ${
    isUser ? 'bg-slate-600 ml-loop-4' : 'bg-black mr-loop-4'
  }`;

  if (!isUser) {
    return (
      <div className={avatarClasses}>
        <GradientLoopOpsLogo width={24} height={24} />
      </div>
    );
  }

  return (
    <div className={avatarClasses}>
      {userMetadata?.avatar_url && (
        <img
          src={userMetadata.avatar_url}
          alt="User Avatar"
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
            const fallback = e.currentTarget.nextElementSibling as HTMLElement;
            if (fallback) fallback.style.display = 'flex';
          }}
        />
      )}
      <div
        className="w-full h-full text-white flex items-center justify-center text-xs font-semibold"
        style={{
          display: userMetadata?.avatar_url ? 'none' : 'flex',
        }}
      >
        {userMetadata?.full_name?.charAt(0)?.toUpperCase() ||
          userEmail?.charAt(0)?.toUpperCase() ||
          'U'}
      </div>
    </div>
  );
};
