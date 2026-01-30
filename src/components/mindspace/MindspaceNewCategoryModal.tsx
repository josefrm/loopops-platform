import { ControlButton } from '@/components/ui/ControlButton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import React, { useState } from 'react';
import { z } from 'zod';

// Validation schema for category name
const categorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Category name is required')
    .max(50, 'Category name must be 50 characters or less'),
});

interface MindspaceNewCategoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (categoryName: string) => void;
  onCreateCategory?: (name: string) => Promise<boolean>;
}

export const MindspaceNewCategoryModal: React.FC<
  MindspaceNewCategoryModalProps
> = ({ open, onOpenChange, onSuccess, onCreateCategory }) => {
  const [categoryName, setCategoryName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [validationError, setValidationError] = useState<string>('');
  const { toast } = useToast();

  // Validate category name
  const validateCategoryName = (name: string): boolean => {
    try {
      categorySchema.parse({ name });
      setValidationError('');
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        setValidationError(error.errors[0]?.message || 'Invalid category name');
      }
      return false;
    }
  };

  // Handle input change with real-time validation
  const handleInputChange = (value: string) => {
    setCategoryName(value);
    if (value.trim()) {
      validateCategoryName(value);
    } else {
      setValidationError('');
    }
  };

  // Handle category creation
  const handleCreateCategory = async () => {
    if (!validateCategoryName(categoryName)) {
      return;
    }

    setIsCreating(true);
    try {
      let success = false;

      if (onCreateCategory) {
        success = await onCreateCategory(categoryName.trim());
      } else {
        // Fallback or Mock API call
        await new Promise((resolve) => setTimeout(resolve, 1000));
        success = Math.random() > 0.2; // 80% success rate
      }

      if (success) {
        toast({
          title: 'Category created',
          description: `"${categoryName.trim()}" has been created successfully.`,
        });

        // Call success callback
        onSuccess?.(categoryName.trim());

        // Close modal and reset form
        onOpenChange(false);
        setCategoryName('');
        setValidationError('');
      } else {
        throw new Error('Failed to create category');
      }
    } catch (error) {
      console.error('Error creating category:', error);
      toast({
        title: 'Creation failed',
        description:
          error instanceof Error
            ? error.message
            : 'Failed to create the category. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    setCategoryName('');
    setValidationError('');
    onOpenChange(false);
  };

  // Handle Enter key press
  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (
      event.key === 'Enter' &&
      !isCreating &&
      validateCategoryName(categoryName)
    ) {
      handleCreateCategory();
    }
  };

  // Check if form is valid
  const isFormValid = categoryName.trim().length > 0 && !validationError;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[441px] p-loop-8">
        <DialogHeader className="relative">
          <DialogTitle className="text-xl font-bold text-gray-900 pr-8">
            New Category
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-loop-4">
          {/* Category Name Input */}
          <div className="space-y-2">
            <Input
              type="text"
              placeholder="Category name"
              value={categoryName}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isCreating}
              className={`w-full h-loop-10 focus:border-brand-accent-50 focus:ring-brand-accent-50 focus-visible:ring-transparent ${
                validationError ? 'border-red-500' : ''
              }`}
              maxLength={50}
            />
            {validationError && (
              <p className="text-sm text-red-500 mt-1">{validationError}</p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between pt-loop-2">
            <ControlButton
              type="transparent_brand"
              size="lg"
              text="Cancel"
              onClick={handleCancel}
              className="!w-[160px]"
              disabled={isCreating}
            />
            <ControlButton
              type="default"
              size="lg"
              text={isCreating ? 'Creating...' : 'Create Category'}
              onClick={handleCreateCategory}
              className="!w-[204px]"
              disabled={isCreating || !isFormValid}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
