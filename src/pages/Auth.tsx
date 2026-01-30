import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { LogIn } from 'lucide-react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../integrations/supabase/client';

const Auth = () => {
  const { user, signInWithGoogle, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkAndRedirect = async () => {
      if (!user) return;

      try {
        // Check onboarding status in v2_onboarding
        const { data: onboardingData, error } = await supabase
          .from('v2_onboarding')
          .select('stage, completed')
          .eq('profile_id', user.id)
          .maybeSingle();

        console.log('Auth - Onboarding check:', { onboardingData, error });

        if (error) {
          console.error('Error checking onboarding:', error);
          navigate('/');
          return;
        }

        // Redirect based on onboarding status
        if (!onboardingData || !onboardingData.completed) {
          console.log(
            'Auth - Redirecting to onboarding, stage:',
            onboardingData?.stage || 0,
          );
          navigate('/onboarding', { replace: true });
        } else {
          console.log('Auth - Onboarding complete, going to home');
          navigate('/', { replace: true });
        }
      } catch (error) {
        console.error('Error in checkAndRedirect:', error);
        navigate('/');
      }
    };

    if (user) {
      checkAndRedirect();
    }
  }, [user, navigate]);

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error('Google sign-in error:', error);
      toast({
        title: 'Authentication Error',
        description: 'Failed to sign in with Google. Please try again.',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{
          backgroundImage:
            'url(/lovable-uploads/e2571371-2025-4a45-9753-227ceadee6d8.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <div className="text-center">
          <img
            src="/lovable-uploads/5ebdf873-109e-4da2-822a-dbe1e81bf6e0.png"
            alt="LoopOps"
            className="h-16 w-auto mx-auto mb-4 animate-pulse"
          />
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        backgroundImage:
          'url(/lovable-uploads/e2571371-2025-4a45-9753-227ceadee6d8.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-4">
            <img
              src="/lovable-uploads/5ebdf873-109e-4da2-822a-dbe1e81bf6e0.png"
              alt="LoopOps"
              className="h-24 w-auto"
            />
          </div>
          <CardTitle className="text-xl">Welcome Back</CardTitle>
          <CardDescription>
            Sign in to access your AI-powered ticket grooming workspace
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={handleGoogleSignIn}
            className="w-full flex items-center space-x-2"
            size="lg"
          >
            <LogIn className="w-5 h-5" />
            <span>Continue with Google</span>
          </Button>

          <div className="text-center text-sm text-slate-500">
            Secure authentication powered by Supabase
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
