import React, { useState } from 'react';
import {
  ControlButton,
  ControlButtonType,
} from '@/components/ui/ControlButton';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { GoogleIcon } from '@/components/ui/icons/GoogleIcon';
import { MicrosoftIcon } from '@/components/ui/icons/MicrosoftIcon';

type SocialProvider = 'google' | 'microsoft';

interface SocialSignInButtonProps {
  provider?: SocialProvider;
  text?: string;
  className?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  type?: ControlButtonType;
}

export const SocialSignInButton: React.FC<SocialSignInButtonProps> = ({
  provider = 'google',
  text,
  className = '!w-full h-loop-10',
  disabled = false,
  size = 'lg',
  type = 'transparent',
}) => {
  const { signInWithGoogle, signInWithMicrosoft } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // Default text based on provider
  const defaultText =
    provider === 'google' ? 'Continue with Google' : 'Continue with Microsoft';

  // Default icon based on provider
  const defaultIcon =
    provider === 'google' ? (
      <GoogleIcon size={20} />
    ) : (
      <MicrosoftIcon size={20} />
    );

  const handleClick = async () => {
    setIsLoading(true);
    try {
      if (provider === 'google') {
        await signInWithGoogle();
      } else if (provider === 'microsoft') {
        await signInWithMicrosoft();
      }
    } catch (error) {
      console.error(`${provider} sign-in error:`, error);
      toast({
        title: 'Authentication Error',
        description: `Failed to sign in with ${
          provider === 'google' ? 'Google' : 'Microsoft'
        }. Please try again.`,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ControlButton
      text={text || defaultText}
      type={type}
      size={size}
      onClick={handleClick}
      className={className}
      icon={defaultIcon}
      disabled={disabled || isLoading}
    />
  );
};
