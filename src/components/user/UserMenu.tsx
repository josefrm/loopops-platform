import {
  DropdownMenu,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useUserProfile } from '@/hooks/useUserProfile';
import { supabase } from '@/integrations/supabase/client';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { UserMenuDropdown } from './UserMenuDropdown';

export const UserMenu: React.FC = () => {
  const { user, signOut } = useAuth();
  const { profile } = useUserProfile();
  const { toast } = useToast();
  const navigate = useNavigate();

  const startOnboarding = async () => {
    try {
      const { error } = await supabase.from('onboarding_status').upsert(
        {
          user_id: user?.id,
          completed: false,
          current_step: 1,
          company: null,
          role: null,
          jira_url: null,
          jira_username: null,
          jira_token: null,
          workspace_id: null,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id',
        },
      );

      if (error) {
        console.error('Error resetting onboarding:', error);
        toast({
          title: 'Error',
          description: 'Failed to start onboarding. Please try again.',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Onboarding Started',
        description: "Let's get you set up!",
      });

      navigate('/onboarding');
    } catch (error) {
      console.error('Error starting onboarding:', error);
      toast({
        title: 'Error',
        description: 'Failed to start onboarding. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: 'Signed out successfully',
        description: 'You have been logged out of your account.',
      });
    } catch (error) {
      console.error('Error signing out:', error);
      toast({
        title: 'Error',
        description: 'Failed to sign out. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleProfileClick = () => {
    navigate('/profile');
  };

  if (!user) return null;

  // Get display name from profile first, then fallback to user metadata, then email
  const getDisplayName = () => {
    const profileName = profile?.name?.trim();
    if (profileName) {
      const nameParts = profileName.split(' ');
      return {
        firstName: nameParts[0] || 'User',
        lastName: nameParts.length > 1 ? nameParts.slice(1).join(' ') : '',
      };
    }

    // Fallback to user metadata
    const metadataName = user.user_metadata?.full_name;
    if (metadataName) {
      const nameParts = metadataName.split(' ');
      return {
        firstName: nameParts[0] || 'User',
        lastName: nameParts.length > 1 ? nameParts.slice(1).join(' ') : '',
      };
    }

    // Final fallback to email
    const emailName = user.email?.split('@')[0] || 'User';
    return {
      firstName: emailName,
      lastName: '',
    };
  };

  const { firstName, lastName } = getDisplayName();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="focus:outline-none">
          <div className="flex items-center space-x-loop-2 h-loop-10">
            <div className="flex flex-col text-right">
              <span className="font-bold text-sm leading-tight text-right">
                {firstName}
              </span>
              <span className="font-normal text-sm leading-tight text-right">
                {lastName}
              </span>
            </div>
            <img
              src="/images/user-icon.png"
              alt="User"
              className="w-loop-10 h-loop-10 rounded-full object-cover"
            />
          </div>
        </button>
      </DropdownMenuTrigger>
      <UserMenuDropdown
        user={user}
        onProfileClick={handleProfileClick}
        onStartOnboarding={startOnboarding}
        onSignOut={handleSignOut}
      />
    </DropdownMenu>
  );
};
