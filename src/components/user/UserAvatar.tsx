import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User } from '@supabase/supabase-js';

interface UserAvatarProps {
  user: User;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({ user }) => {
  const userInitials = user.user_metadata?.full_name
    ? user.user_metadata.full_name
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()
    : user.email?.charAt(0).toUpperCase() || 'U';

  return (
    <div className="relative h-8 w-8 rounded-full cursor-pointer hover:opacity-80 transition-opacity">
      <Avatar className="h-8 w-8">
        <AvatarImage
          src={user.user_metadata?.avatar_url}
          alt={user.user_metadata?.full_name || user.email || 'User'}
        />
        <AvatarFallback>{userInitials}</AvatarFallback>
      </Avatar>
    </div>
  );
};
