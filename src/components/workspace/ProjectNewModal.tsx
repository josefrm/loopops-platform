import { ControlButton } from '@/components/ui/ControlButton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import React, { useState } from 'react';
import { z } from 'zod';

// Validation schema for project creation
const projectSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Project name is required')
    .max(100, 'Project name must be 100 characters or less'),
  description: z
    .string()
    .trim()
    .max(500, 'Description must be 500 characters or less')
    .optional(),
});

interface ProjectData {
  name: string;
  description?: string;
}

interface ProjectNewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (project: ProjectData) => void;
  onCreateProject?: (projectData: ProjectData) => Promise<boolean>;
}

export const ProjectNewModal: React.FC<ProjectNewModalProps> = ({
  open,
  onOpenChange,
  onSuccess,
  onCreateProject,
}) => {
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{
    name?: string;
    description?: string;
  }>({});
  const { toast } = useToast();

  // Validate project data
  const validateProjectData = (name: string, description: string): boolean => {
    try {
      projectSchema.parse({ name, description });
      setValidationErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: { name?: string; description?: string } = {};
        error.errors.forEach((err) => {
          if (err.path[0] === 'name') {
            errors.name = err.message;
          } else if (err.path[0] === 'description') {
            errors.description = err.message;
          }
        });
        setValidationErrors(errors);
      }
      return false;
    }
  };

  // Handle input changes with real-time validation
  const handleNameChange = (value: string) => {
    setProjectName(value);
    if (value.trim() || projectDescription.trim()) {
      validateProjectData(value, projectDescription);
    } else {
      setValidationErrors({});
    }
  };

  const handleDescriptionChange = (value: string) => {
    setProjectDescription(value);
    if (projectName.trim() || value.trim()) {
      validateProjectData(projectName, value);
    } else {
      setValidationErrors({});
    }
  };

  // Handle project creation
  const handleCreateProject = async () => {
    if (!validateProjectData(projectName, projectDescription)) {
      return;
    }

    const projectData: ProjectData = {
      name: projectName.trim(),
      description: projectDescription.trim() || undefined,
    };

    setIsCreating(true);
    try {
      let success = false;

      if (onCreateProject) {
        success = await onCreateProject(projectData);
      } else {
        // Fallback or Mock API call
        await new Promise((resolve) => setTimeout(resolve, 1000));
        success = Math.random() > 0.2; // 80% success rate

        if (success) {
          toast({
            title: 'Project created',
            description: `"${projectData.name}" has been created successfully.`,
          });
        }
      }

      if (success) {
        // Call success callback
        onSuccess?.(projectData);

        // Close modal and reset form
        onOpenChange(false);
        setProjectName('');
        setProjectDescription('');
        setValidationErrors({});
      } else {
        throw new Error('Failed to create project');
      }
    } catch (error) {
      // Only show error toast if not using custom onCreateProject
      // (custom handlers are expected to show their own toasts)
      if (!onCreateProject) {
        console.error('Error creating project:', error);
        toast({
          title: 'Creation failed',
          description:
            error instanceof Error
              ? error.message
              : 'Failed to create the project. Please try again.',
          variant: 'destructive',
        });
      }
    } finally {
      setIsCreating(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    setProjectName('');
    setProjectDescription('');
    setValidationErrors({});
    onOpenChange(false);
  };

  // Handle Enter key press
  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (
      event.key === 'Enter' &&
      !isCreating &&
      validateProjectData(projectName, projectDescription)
    ) {
      handleCreateProject();
    }
  };

  // Check if form is valid
  const isFormValid =
    projectName.trim().length > 0 &&
    !validationErrors.name &&
    !validationErrors.description;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[441px] p-loop-8">
        <DialogHeader className="relative">
          <DialogTitle className="text-xl font-bold text-gray-900 pr-8">
            New Project
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-loop-4">
          {/* Project Name Input */}
          <div className="space-y-2">
            <Input
              type="text"
              placeholder="Project name"
              value={projectName}
              onChange={(e) => handleNameChange(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isCreating}
              className={`w-full h-loop-10 focus:border-brand-accent-50 focus:ring-brand-accent-50 focus-visible:ring-transparent ${
                validationErrors.name ? 'border-red-500' : ''
              }`}
              maxLength={100}
            />
            {validationErrors.name && (
              <p className="text-sm text-red-500 mt-1">
                {validationErrors.name}
              </p>
            )}
          </div>

          {/* Project Description Input */}
          <div className="space-y-2">
            <Textarea
              placeholder="Project description (optional)"
              value={projectDescription}
              onChange={(e) => handleDescriptionChange(e.target.value)}
              disabled={isCreating}
              className={`w-full min-h-[80px] focus:border-brand-accent-50 focus:ring-brand-accent-50 focus-visible:ring-transparent resize-none ${
                validationErrors.description ? 'border-red-500' : ''
              }`}
              maxLength={500}
            />
            {validationErrors.description && (
              <p className="text-sm text-red-500 mt-1">
                {validationErrors.description}
              </p>
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
              text={isCreating ? 'Creating...' : 'Create Project'}
              onClick={handleCreateProject}
              className="!w-[204px]"
              disabled={isCreating || !isFormValid}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
