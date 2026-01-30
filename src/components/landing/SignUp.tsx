import { Checkbox } from '@/components/ui/checkbox';
import { ControlButton } from '@/components/ui/ControlButton';
import { Input } from '@/components/ui/input';
import { SocialSignInButton } from '@/components/ui/SocialSignInButton';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Eye, EyeClosed, LogIn } from 'lucide-react';
import React, { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { ActionableText } from '../ui/ActionableText';

// Zod validation schema
const signUpSchema = z
  .object({
    email: z.string().email('Please enter a valid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters long'),
    confirmPassword: z.string(),
    keepSignedIn: z.boolean(),
    agreeTerms: z.boolean().refine((val) => val === true, {
      message: 'You must agree to the terms and conditions',
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type SignUpFormData = z.infer<typeof signUpSchema>;

export const SignUp: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState<SignUpFormData>({
    email: '',
    password: '',
    confirmPassword: '',
    keepSignedIn: false,
    agreeTerms: false,
  });

  const [errors, setErrors] = useState<
    Partial<Record<keyof SignUpFormData, string>>
  >({});

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Debounced password matching validation
  const debouncedPasswordMatch = useCallback(
    (password: string, confirmPassword: string) => {
      if (confirmPassword && password !== confirmPassword) {
        setErrors((prev) => ({
          ...prev,
          confirmPassword: 'Passwords do not match',
        }));
      } else if (confirmPassword && password === confirmPassword) {
        setErrors((prev) => ({
          ...prev,
          confirmPassword: undefined,
        }));
      }
    },
    [],
  );

  const handleInputChange =
    (field: keyof SignUpFormData) =>
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const value =
          e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        const newFormData = { ...formData, [field]: value };
        setFormData(newFormData);

        // Validate the specific field and clear error if it becomes valid
        try {
          if (field === 'email') {
            z.string().email().parse(value);
            setErrors((prev) => ({ ...prev, email: undefined }));
          } else if (field === 'password') {
            z.string().min(8).parse(value);
            setErrors((prev) => ({ ...prev, password: undefined }));
            // Also check confirm password when password changes
            if (newFormData.confirmPassword) {
              debouncedPasswordMatch(
                value as string,
                newFormData.confirmPassword,
              );
            }
          } else if (field === 'confirmPassword') {
            // Use debounced validation for password matching
            debouncedPasswordMatch(newFormData.password, value as string);
          }
        } catch {
          // Field is still invalid, keep the error
        }
      };

  const validateForm = () => {
    try {
      signUpSchema.parse(formData);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Partial<Record<keyof SignUpFormData, string>> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0] as keyof SignUpFormData] = err.message;
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
      const { error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      });

      if (error) throw error;

      toast({
        title: 'Account created successfully!',
        description: "Let's get you set up.",
      });

      // User profile and onboarding record are created automatically via database trigger
      // Redirect to onboarding flow
      navigate('/onboarding', { replace: true });
    } catch (error: any) {
      console.error('Signup error:', error);
      toast({
        title: 'Sign up failed',
        description: error.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignInClick = () => {
    navigate('/login');
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
            <h1 className="text-lg font-bold">Sign up to LoopOps</h1>
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

                  {/* Confirm Password */}
                  <div>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={formData.confirmPassword}
                        onChange={handleInputChange('confirmPassword')}
                        className={
                          errors.confirmPassword
                            ? 'border-system-error-50 pr-loop-10'
                            : 'h-loop-10 pr-loop-10'
                        }
                        placeholder="Confirm Password"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                        tabIndex={-1}
                        className="absolute right-loop-3 top-1/2 -translate-y-1/2 text-neutral-grayscale-40 hover:text-neutral-grayscale-60 transition-colors"
                      >
                        {showConfirmPassword ? (
                          <Eye size={16} />
                        ) : (
                          <EyeClosed size={16} />
                        )}
                      </button>
                    </div>
                    {errors.confirmPassword && (
                      <p className="mt-loop-1 text-sm text-system-error-50">
                        {errors.confirmPassword}
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

                  {/* Terms and conditions checkbox */}
                  <div>
                    <div className="flex items-center space-x-loop-2">
                      <Checkbox
                        id="agreeTerms"
                        checked={formData.agreeTerms}
                        onCheckedChange={(checked) => {
                          setFormData((prev) => ({
                            ...prev,
                            agreeTerms: checked as boolean,
                          }));
                          // Clear error when user checks the terms
                          if (checked && errors.agreeTerms) {
                            setErrors((prev) => ({
                              ...prev,
                              agreeTerms: undefined,
                            }));
                          }
                        }}
                        className="h-loop-6 w-loop-6 rounded-full data-[state=checked]:bg-system-success-50 data-[state=checked]:border-system-success-50"
                      />
                      <label
                        htmlFor="agreeTerms"
                        className="text-sm text-neutral-grayscale-90"
                      >
                        I agree to the terms and conditions
                      </label>
                    </div>
                    {errors.agreeTerms && (
                      <p className="mt-loop-1 text-sm text-system-error-50">
                        {errors.agreeTerms}
                      </p>
                    )}
                  </div>
                </div>

                {/* Sign Up button */}
                <ControlButton
                  text={loading ? 'Creating account...' : 'Sign Up'}
                  type="default"
                  size="lg"
                  onClick={handleButtonClick}
                  disabled={loading}
                  className="!w-full h-loop-10"
                />

                <ActionableText
                  text="Already have an account? Sign in"
                  onClick={handleSignInClick}
                  icon={LogIn}
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
