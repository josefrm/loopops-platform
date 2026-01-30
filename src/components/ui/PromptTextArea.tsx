import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

interface InactiveStateConfig {
  title?: string | null;
  description?: string | null;
  buttonText?: string | null;
  buttonDisabled?: boolean;
  onButtonClick?: () => void | Promise<void>;
}

interface ActiveStateConfig {
  labelText?: string | null;
  placeholder?: string | null;
  bottomLabelText?: string | null;
}

interface PromptTextAreaProps {
  // Value and onChange for controlled component
  value?: string;
  onChange?: (value: string) => void;

  // Initial state
  defaultActive?: boolean;

  // State configurations
  inactiveConfig?: InactiveStateConfig;
  activeConfig?: ActiveStateConfig;

  // Additional props
  className?: string;
  error?: string; // Add error prop
}

export const PromptTextArea: React.FC<PromptTextAreaProps> = ({
  value = '',
  onChange,
  defaultActive = false,
  inactiveConfig = {},
  activeConfig = {},
  className = '',
  error,
}) => {
  const [isActive, setIsActive] = useState(defaultActive);
  const [isLoading, setIsLoading] = useState(false);

  // Update isActive when defaultActive prop changes
  useEffect(() => {
    setIsActive(defaultActive);
  }, [defaultActive]);

  // Destructure config objects with defaults
  const {
    title: inactiveTitle,
    description: inactiveDescription,
    buttonText: inactiveButtonText,
    buttonDisabled: inactiveButtonDisabled,
    onButtonClick: onInactiveButtonClick,
  } = inactiveConfig;

  const {
    labelText: activeLabelText,
    placeholder:
      activePlaceholder = 'Enter detailed instructions for this agent...',
    bottomLabelText: activeBottomLabelText,
  } = activeConfig;

  const handleInactiveButtonClick = async () => {
    if (onInactiveButtonClick) {
      setIsLoading(true);
      try {
        await onInactiveButtonClick();
        setIsActive(true);
      } catch (error) {
        console.error('Error in onInactiveButtonClick:', error);
        // You can add error handling here if needed
      } finally {
        setIsLoading(false);
      }
    } else {
      setIsActive(true);
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (onChange) {
      onChange(e.target.value);
    }
  };

  if (!isActive) {
    // Inactive State
    return (
      <div
        className={`flex items-center justify-center border-2 border-dotted border-white rounded-lg ${className}`}
        style={{ minHeight: '300px' }}
      >
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          {inactiveTitle && (
            <h3
              className="text-white"
              style={{
                fontSize: '14px',
                fontStyle: 'normal',
                fontWeight: 700,
              }}
            >
              {inactiveTitle}
            </h3>
          )}

          {inactiveDescription && (
            <p
              className="text-white"
              style={{
                fontSize: '14px',
                fontStyle: 'normal',
                fontWeight: 400,
                maxWidth: '400px',
              }}
            >
              {inactiveDescription}
            </p>
          )}

          {inactiveButtonText && (
            <Button
              type="button"
              onClick={handleInactiveButtonClick}
              disabled={inactiveButtonDisabled || isLoading}
              className="px-8 py-2 bg-white text-black rounded-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-brand-accent-50 hover:text-white"
            >
              {isLoading ? '...' : inactiveButtonText}
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Active State
  return (
    <div className={`flex flex-col space-y-2 ${className}`}>
      {activeLabelText && (
        <Label
          htmlFor="prompt_textarea"
          className="text-white text-md font-normal text-neutral-grayscale-30"
        >
          {activeLabelText}
        </Label>
      )}

      <textarea
        id="prompt_textarea"
        value={value}
        onChange={handleTextareaChange}
        placeholder={activePlaceholder || undefined}
        className={`w-full p-4 bg-transparent border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-slate-400 text-[13px] ${
          error ? 'border-red-400' : 'border-white'
        }`}
        style={{ minHeight: '300px' }}
      />

      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}

      {activeBottomLabelText && (
        <label className="block text-[13px] font-medium text-neutral-grayscale-50">
          {activeBottomLabelText}
        </label>
      )}
    </div>
  );
};
