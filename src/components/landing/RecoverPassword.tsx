import { ControlButton } from '@/components/ui/ControlButton';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Mail } from 'lucide-react';
import React, { useState } from 'react';
import { z } from 'zod';
import { ActionableText } from '../ui/ActionableText';

// Zod validation schema for password recovery
const recoverPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type RecoverPasswordFormData = z.infer<typeof recoverPasswordSchema>;

export const RecoverPassword: React.FC = () => {
  const [formData, setFormData] = useState<RecoverPasswordFormData>({
    email: '',
  });

  const [errors, setErrors] = useState<
    Partial<Record<keyof RecoverPasswordFormData, string>>
  >({});

  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleInputChange =
    (field: keyof RecoverPasswordFormData) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setFormData({ ...formData, [field]: value });

      // Validate the email field and clear error if it becomes valid
      try {
        if (field === 'email') {
          z.string().email().parse(value);
          setErrors((prev) => ({ ...prev, email: undefined }));
        }
      } catch {
        // Field is still invalid, keep the error
      }
    };

  const validateForm = () => {
    try {
      recoverPasswordSchema.parse(formData);
      // Form is valid - proceed with password recovery
      console.log('Password recovery requested for:', formData.email);
      setErrors({});
      setIsSubmitted(true);
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Partial<
          Record<keyof RecoverPasswordFormData, string>
        > = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0] as keyof RecoverPasswordFormData] =
              err.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    validateForm();
  };

  const handleButtonClick = () => {
    validateForm();
  };

  const handleBackToLogin = () => {
    // Navigate back to login page
    window.history.back();
  };

  if (isSubmitted) {
    return (
      <div
        className="min-h-screen w-full bg-cover bg-center flex items-center justify-center p-loop-8"
        style={{ backgroundImage: "url('/images/background/cover03.jpg')" }}
      >
        <div className="flex flex-col items-center justify-center text-center space-y-loop-8">
          {/* Success Message */}
          <div className="space-y-loop-10 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 p-loop-12 shadow-2xl w-[500px]">
            <div className="space-y-loop-6">
              <div className="flex space-x-loop-4">
                <img
                  src="/images/loopops_icons/loopops_mask.svg"
                  alt="Loop Ops Logo"
                  className="max-w-[50px] h-auto drop-shadow-sm"
                />
                <Mail className="h-loop-16 w-loop-16 text-system-success-50" />
              </div>
              <h1 className="text-lg font-bold text-white">Check your email</h1>
              <p className="text-sm text-neutral-grayscale-20">
                We've sent a password recovery link to{' '}
                <strong>{formData.email}</strong>
              </p>
              <p className="text-sm text-neutral-grayscale-40">
                Didn't receive the email? Check your spam folder or try again.
              </p>
            </div>

            <div className="space-y-loop-4">
              <ControlButton
                text="Resend email"
                type="transparent"
                size="lg"
                onClick={() => setIsSubmitted(false)}
                className="!w-full h-loop-10 bg-white/10 hover:bg-white/20 text-white border-white/20"
              />

              <ActionableText
                text="Back to login"
                onClick={handleBackToLogin}
                icon={ArrowLeft}
                textClassName="text-white hover:text-brand-accent-50 transition-colors text-sm"
                iconClassName="text-brand-accent-50"
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen w-full bg-cover bg-center flex items-center justify-center p-loop-8"
      style={{ backgroundImage: "url('/images/background/cover03.jpg')" }}
    >
      <div className="flex flex-col items-center justify-center text-center space-y-loop-8">
        {/* Recover Password Form */}
        <div className="space-y-loop-10 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 p-loop-12 shadow-2xl w-[500px]">
          <div className="space-y-loop-4">
            <div className="flex space-x-loop-4">
              <img
                src="/images/loopops_icons/loopops_mask.svg"
                alt="Loop Ops Logo"
                className="max-w-[50px] h-auto drop-shadow-sm"
              />
              <h1 className="text-lg font-bold text-white">Recover Password</h1>
            </div>
            <p className="text-sm text-neutral-grayscale-20">
              Enter your email address and we'll send you a link to reset your
              password.
            </p>
          </div>

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
                    errors.email
                      ? 'border-system-error-50 bg-white/10 border-white/20 text-white placeholder:text-neutral-grayscale-40'
                      : 'h-loop-10 bg-white/10 border-white/20 text-white placeholder:text-neutral-grayscale-40 focus:border-white/50 focus:bg-white/20'
                  }
                  placeholder="Enter your email address"
                />
                {errors.email && (
                  <p className="mt-loop-1 text-sm text-system-error-50">
                    {errors.email}
                  </p>
                )}
              </div>
            </div>

            {/* Send Reset Link button */}
            <ControlButton
              text="Send Reset Link"
              type="default"
              size="lg"
              onClick={handleButtonClick}
              className="!w-full h-loop-10"
            />

            <ActionableText
              text="Back to login"
              onClick={handleBackToLogin}
              icon={ArrowLeft}
              textClassName="text-white hover:text-brand-accent-50 transition-colors text-sm"
              iconClassName="text-brand-accent-50"
            />
          </form>
        </div>
      </div>
    </div>
  );
};
