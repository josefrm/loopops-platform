import { Checkbox } from '@/components/ui/checkbox';
import { ControlButton } from '@/components/ui/ControlButton';
import { Input } from '@/components/ui/input';
import { SocialSignInButton } from '@/components/ui/SocialSignInButton';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Eye, EyeClosed, LockKeyholeOpen, UserPlus } from 'lucide-react';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { ActionableText } from '../ui/ActionableText';

// Zod validation schema for login (simpler than signup)
const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
  keepSignedIn: z.boolean(),
});

type LogInFormData = z.infer<typeof loginSchema>;

export const LogIn: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState<LogInFormData>({
    email: '',
    password: '',
    keepSignedIn: false,
  });

  const [errors, setErrors] = useState<
    Partial<Record<keyof LogInFormData, string>>
  >({});

  const [showPassword, setShowPassword] = useState(false);

  const handleInputChange =
    (field: keyof LogInFormData) =>
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const value =
          e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        setFormData({ ...formData, [field]: value });

        // Validate the specific field and clear error if it becomes valid
        try {
          if (field === 'email') {
            z.string().email().parse(value);
            setErrors((prev) => ({ ...prev, email: undefined }));
          } else if (field === 'password') {
            z.string().min(1).parse(value);
            setErrors((prev) => ({ ...prev, password: undefined }));
          }
        } catch {
          // Field is still invalid, keep the error
        }
      };

  const validateForm = () => {
    try {
      loginSchema.parse(formData);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Partial<Record<keyof LogInFormData, string>> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0] as keyof LogInFormData] = err.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleButtonClick();
  };

  const handleButtonClick = async () => {
    // Validate form first
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) throw error;

      if (!authData.user) {
        throw new Error('No user returned from sign in');
      }

      console.log('Login - User authenticated:', authData.user.id);

      // Check onboarding status in v2_onboarding BEFORE any other operations
      const { data: onboardingData, error: onboardingError } = await supabase
        .from('v2_onboarding')
        .select('stage, completed')
        .eq('profile_id', authData.user.id)
        .maybeSingle();

      console.log('Login - Onboarding check result:', {
        data: onboardingData,
        error: onboardingError,
        user_id: authData.user.id,
      });

      if (onboardingError) {
        console.error(
          'Login - Error checking onboarding status:',
          onboardingError,
        );
        // If we can't check onboarding, try to go to home but let ProtectedRoute handle it
        toast({
          title: 'Welcome back!',
          description: "You've successfully signed in.",
        });
        setTimeout(() => navigate('/', { replace: true }), 100);
        return;
      }

      // Redirect based on onboarding status
      if (!onboardingData || !onboardingData.completed) {
        const stage = onboardingData?.stage ?? 0;
        console.log(
          'Login - Onboarding INCOMPLETE. Stage:',
          stage,
          'Completed:',
          onboardingData?.completed,
        );

        toast({
          title: 'Welcome back!',
          description: "Let's continue your setup.",
        });

        // Immediate hard redirect to prevent any other context providers from running
        console.log('Login - REDIRECTING to /onboarding now');
        setTimeout(() => navigate('/onboarding', { replace: true }), 100);
        return;
      } else {
        console.log('Login - Onboarding COMPLETE, going to home');
        toast({
          title: 'Welcome back!',
          description: "You've successfully signed in.",
        });
        setTimeout(() => navigate('/', { replace: true }), 100);
      }
    } catch (error: any) {
      console.error('Login error:', error);
      toast({
        title: 'Sign in failed',
        description:
          error.message || 'Please check your credentials and try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-workspace-gradient flex items-center justify-center p-loop-8">
      <div className="flex flex-col items-center justify-center text-center space-y-loop-8">
        {/* Logo */}
        <div className="flex items-center justify-center">
          <img
            src="/lovable-uploads/landing_loopops_logo.png"
            alt="Loop Ops Logo"
            className="max-w-[170px] h-auto"
          />
        </div>

        {/* Welcome Message */}
        <div className="space-y-loop-10 rounded-md bg-neutral-grayscale-0 p-loop-12 shadow-lg w-[700px]">
          <div className="flex">
            <h1 className="text-lg font-bold">Login</h1>
          </div>

          {/* Two columns layout with margin top */}
          <div className="mt-loop-8 flex">
            {/* First column - 50% width */}
            <div className="w-1/2">
              <form onSubmit={handleSubmit} className="space-y-loop-6">
                {/* Email */}
                <div className="space-y-loop-4">
                  <div>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange('email')}
                      className={
                        errors.email ? 'border-system-error-50' : 'h-loop-10'
                      }
                      placeholder="Email"
                    />
                    {errors.email && (
                      <p className="mt-loop-1 text-sm text-system-error-50">
                        {errors.email}
                      </p>
                    )}
                  </div>

                  {/* Password */}
                  <div>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password}
                        onChange={handleInputChange('password')}
                        className={
                          errors.password
                            ? 'border-system-error-50 pr-loop-10'
                            : 'h-loop-10 pr-loop-10'
                        }
                        placeholder="Password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        tabIndex={-1}
                        className="absolute right-loop-3 top-1/2 -translate-y-1/2 text-neutral-grayscale-40 hover:text-neutral-grayscale-60 transition-colors"
                      >
                        {showPassword ? (
                          <Eye size={16} />
                        ) : (
                          <EyeClosed size={16} />
                        )}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="mt-loop-1 text-sm text-system-error-50">
                        {errors.password}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-loop-2">
                  {/* Keep me signed in checkbox */}
                  <div className="flex items-center space-x-loop-2">
                    <Checkbox
                      id="keepSignedIn"
                      checked={formData.keepSignedIn}
                      onCheckedChange={(checked) =>
                        setFormData((prev) => ({
                          ...prev,
                          keepSignedIn: checked as boolean,
                        }))
                      }
                      className="h-loop-6 w-loop-6 rounded-full data-[state=checked]:bg-system-success-50 data-[state=checked]:border-system-success-50"
                    />
                    <label
                      htmlFor="keepSignedIn"
                      className="text-sm text-neutral-grayscale-90"
                    >
                      Keep me signed in
                    </label>
                  </div>
                </div>

                {/* Sign In button */}
                <ControlButton
                  text={loading ? 'Signing in...' : 'Sign In'}
                  type="default"
                  size="lg"
                  onClick={handleButtonClick}
                  disabled={loading}
                  className="!w-full h-loop-10"
                />

                <ActionableText
                  text="Forgot your password?"
                  onClick={() => navigate('/recover-password', { replace: true })}
                  icon={LockKeyholeOpen}
                  textClassName="text-brand-accent-50 text-sm"
                  iconClassName="text-brand-accent-50"
                />

                <ActionableText
                  text="New to LoopOps? Create an account."
                  onClick={() => navigate('/signup')}
                  icon={UserPlus}
                  textClassName="text-brand-accent-50 text-sm"
                  iconClassName="text-brand-accent-50"
                />
              </form>
            </div>

            {/* Vertical separator line */}
            <div className="w-px bg-neutral-grayscale-30 mx-loop-12"></div>

            {/* Second column - 50% width (empty for now) */}
            <div className="w-1/2 space-y-loop-6">
              <h1 className="text-lg font-bold">Or</h1>
              <div className="space-y-loop-4">
                <SocialSignInButton
                  provider="google"
                  type="transparent"
                  size="lg"
                />
                <SocialSignInButton
                  provider="microsoft"
                  type="transparent"
                  size="lg"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
