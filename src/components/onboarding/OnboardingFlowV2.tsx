import { STORAGE_KEYS } from '@/constants/storageKeys';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { WorkspaceService } from '@/services/WorkspaceService';
import { useWorkspaceProjectStore } from '@/stores/workspaceProjectStore';
import { ArrowLeft, Camera, Loader2, User } from 'lucide-react';
import React, { useRef, useState } from 'react';
import { z } from 'zod';
import { CircleControlIcon } from '../ui/CircleControlIcon';
import { ControlButton } from '../ui/ControlButton';
import { CustomSelectFilter } from '../ui/CustomSelectFilter';
import { Input } from '../ui/input';

// V2 onboarding form schema matching the new backend expectations
const onboardingSchemaV2 = z.object({
  // Step 1: Profile
  name: z.string().min(1, 'Please enter your name'),
  role: z.string().optional(),
  profilePicture: z.string().optional(),
  // Step 2: Workspace
  workspaceName: z.string().min(1, 'Please enter your workspace name'),
  // Step 3: Project
  projectName: z.string().min(1, 'Please enter your project name'),
});

type OnboardingFormDataV2 = z.infer<typeof onboardingSchemaV2>;

// Updated role options to match new backend
const roleOptionsV2 = [
  {
    key: 'Product Manager',
    name: 'Product Manager',
    description: 'Manages project timelines and resources',
  },
  {
    key: 'Engineering Manager',
    name: 'Engineering Manager',
    description: 'Manages engineering teams and technical direction',
  },
  {
    key: 'Developer',
    name: 'Developer',
    description: 'Builds and maintains software applications',
  },
  {
    key: 'Designer',
    name: 'Designer',
    description: 'Creates user interfaces and experiences',
  },
  {
    key: 'QA Engineer',
    name: 'QA Engineer',
    description: 'Tests and ensures software quality',
  },
  {
    key: 'Scrum Master',
    name: 'Scrum Master',
    description: 'Facilitates Agile development processes',
  },
  {
    key: 'Other',
    name: 'Other',
    description: 'Other role not listed above',
  },
];

export const OnboardingFlowV2: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const resetStore = useWorkspaceProjectStore((state) => state.reset);

  // Form state
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<Partial<OnboardingFormDataV2>>({});
  const [errors, setErrors] = useState<
    Partial<Record<keyof OnboardingFormDataV2, string>>
  >({});
  const [selectedRole, setSelectedRole] = useState<
    (typeof roleOptionsV2)[0] | null
  >(null);
  const [isLoading, setIsLoading] = useState(false);

  // Backend state
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [isSettingUpProject, setIsSettingUpProject] = useState(false);
  const [setupStatus, setSetupStatus] = useState<string>('');
  const [setupError, setSetupError] = useState<string | null>(null);

  // Handle input changes
  const handleInputChange =
    (field: keyof OnboardingFormDataV2) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setFormData((prev) => ({ ...prev, [field]: value }));

      // Clear error when user starts typing
      if (errors[field]) {
        setErrors((prev) => ({ ...prev, [field]: undefined }));
      }
    };

  const handleRoleChange = (role: (typeof roleOptionsV2)[0]) => {
    setSelectedRole(role);
    setFormData((prev) => ({ ...prev, role: role.key }));
  };

  const handleBackClick = () => {
    if (currentStep > 1 && !isLoading) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleProfilePictureClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({
          title: 'Invalid file type',
          description: 'Please select an image file',
          variant: 'destructive',
        });
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: 'File size must be less than 5MB',
          variant: 'destructive',
        });
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setFormData((prev) => ({ ...prev, profilePicture: result }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Validation logic
  const getFieldsForStep = (step: number): (keyof OnboardingFormDataV2)[] => {
    switch (step) {
      case 1:
        return ['name'];
      case 2:
        return ['workspaceName'];
      case 3:
        return ['projectName'];
      default:
        return [];
    }
  };

  const validateCurrentStep = () => {
    const fieldsToValidate = getFieldsForStep(currentStep);
    const stepData = Object.fromEntries(
      Object.entries(formData).filter(([key]) =>
        fieldsToValidate.includes(key as keyof OnboardingFormDataV2),
      ),
    );

    try {
      // Create a partial schema for current step
      const stepSchema = z.object(
        Object.fromEntries(
          fieldsToValidate.map((field) => [
            field,
            onboardingSchemaV2.shape[
              field as keyof typeof onboardingSchemaV2.shape
            ],
          ]),
        ),
      );

      stepSchema.parse(stepData);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Partial<Record<keyof OnboardingFormDataV2, string>> =
          {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0] as keyof OnboardingFormDataV2] = err.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  // Backend integration functions
  const updateProfile = async () => {
    if (!user) throw new Error('No user found');

    const { data: session } = await supabase.auth.getSession();
    if (!session.session) throw new Error('No active session');

    const { data, error } = await supabase.functions.invoke(
      'update-profile-v2',
      {
        body: {
          name: formData.name?.trim(),
          role: formData.role || null,
          profilePicture: formData.profilePicture || null,
          user_id: session.session.user.id,
        },
        headers: {
          Authorization: `Bearer ${session.session.access_token}`,
        },
      },
    );

    if (error) throw error;
    return data;
  };

  const createWorkspace = async () => {
    if (!user) throw new Error('No user found');

    const { data: session } = await supabase.auth.getSession();
    if (!session.session) throw new Error('No active session');

    const { data, error } = await supabase.functions.invoke(
      'create-workspace-v2',
      {
        body: {
          name: formData.workspaceName?.trim(),
          role: 'admin',
          user_id: session.session.user.id,
        },
        headers: {
          Authorization: `Bearer ${session.session.access_token}`,
        },
      },
    );

    if (error) throw error;
    return data;
  };

  const createProject = async () => {
    if (!user || !workspaceId) throw new Error('Missing user or workspace');

    const result = await WorkspaceService.createProjectV2({
      name: formData.projectName?.trim() || '',
      workspace_id: workspaceId,
    });

    return result;
  };

  const setupProjectLoopops = async (projectId: string) => {
    if (!user || !workspaceId) throw new Error('Missing user or workspace');

    const { data: session } = await supabase.auth.getSession();
    if (!session.session) throw new Error('No active session');

    const { data, error } = await supabase.functions.invoke(
      'setup-project-loopops',
      {
        body: {
          workspace_id: workspaceId,
          project_id: projectId,
          user_id: session.session.user.id,
          project_name: formData.projectName?.trim(),
        },
        headers: {
          Authorization: `Bearer ${session.session.access_token}`,
        },
      },
    );

    if (error) throw error;
    return data;
  };

  // Handle continue button click
  const handleContinueClick = async () => {
    if (!validateCurrentStep() || !user?.id) return;

    setIsLoading(true);

    try {
      if (currentStep === 1) {
        // Step 1: Update profile
        await updateProfile();
        toast({
          title: 'Profile updated!',
          description: 'Your profile information has been saved.',
        });
        setCurrentStep(2);
      } else if (currentStep === 2) {
        // Step 2: Create workspace
        const workspaceData = await createWorkspace();
        setWorkspaceId(workspaceData.workspace.id);
        toast({
          title: 'Workspace created!',
          description: `Your workspace "${formData.workspaceName}" has been created.`,
        });
        setCurrentStep(3);
      } else if (currentStep === 3) {
        // Step 3: Create project and set up LoopOps
        setIsSettingUpProject(true);
        setSetupStatus('Creating project...');

        try {
          const projectData = await createProject();
          setSetupStatus('Setting up LoopOps...');
          await setupProjectLoopops(projectData.project.id);
          setSetupStatus('Almost done...');

          // Small delay to show completion
          await new Promise((resolve) => setTimeout(resolve, 500));

          toast({
            title: 'Onboarding complete!',
            description: `Your project "${formData.projectName}" has been created and set up.`,
          });

          // Explicitly clear the persisted store from localStorage to prevent old workspace/project data from being used
          // This ensures that when the homepage loads, the queries will fetch fresh data from the database
          localStorage.removeItem(STORAGE_KEYS.WORKSPACE_PROJECT_STORE);

          // Also reset the store state to initial values
          resetStore();

          // Clear all walkthrough session storage for fresh user experience
          sessionStorage.removeItem('project_context_walkthrough_completed_1');
          sessionStorage.removeItem('chat_walkthrough_completed_1');
          sessionStorage.removeItem('mindspace_walkthrough_completed_1');

          // Force a full page reload to ensure all components re-initialize with fresh data
          // Using window.location instead of navigate() to avoid stale component state
          window.location.href = '/';
        } catch (setupError: any) {
          console.error('Error setting up project:', setupError);
          setSetupError(
            setupError.message || 'Failed to set up project. Please try again.',
          );
          setIsSettingUpProject(false);
          toast({
            title: 'Setup failed',
            description:
              setupError.message ||
              'Project was created but setup failed. You can retry setup later.',
            variant: 'destructive',
          });
        }
      }
    } catch (error: any) {
      console.error('Error in onboarding step:', error);
      toast({
        title: 'Error',
        description: error.message || 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Render setup screen
  if (isSettingUpProject) {
    return (
      <div
        className="min-h-screen w-full bg-cover bg-center flex items-center justify-center p-loop-8"
        style={{ backgroundImage: "url('/images/background/cover02.png')" }}
      >
        <div className="w-[1120px] h-[644px] rounded-custom shadow-lg overflow-hidden flex">
          {/* Left Panel - Setup Status */}
          <div className="w-1/2 bg-neutral-grayscale-0 p-loop-14 space-y-loop-10 flex flex-col justify-center">
            <div className="space-y-loop-8 px-loop-14">
              <div className="space-y-loop-4">
                <img
                  src="/images/loopops_icons/loopops_black.svg"
                  alt="Loop Ops Logo"
                  className="h-[32px] w-auto"
                />
                <h1 className="text-3xl font-bold">Setting up your project</h1>
              </div>

              <div className="space-y-loop-6">
                <div className="flex items-center gap-loop-4">
                  <Loader2 className="h-8 w-8 animate-spin text-brand-accent-50" />
                  <div className="flex-1">
                    <p className="text-lg text-neutral-grayscale-70">
                      {setupStatus}
                    </p>
                    <p className="text-sm text-neutral-grayscale-50">
                      We're creating your workspace, stages, agents, and storage
                      buckets.
                    </p>
                  </div>
                </div>

                {setupError && (
                  <div className="space-y-loop-4 p-loop-4 bg-system-error-10 rounded-md">
                    <div className="flex items-center gap-loop-2">
                      <div className="w-5 h-5 bg-system-error-50 rounded-full flex items-center justify-center">
                        <span className="text-neutral-grayscale-0 text-xs">
                          !
                        </span>
                      </div>
                      <span className="text-sm font-medium text-system-error-50">
                        Setup Error
                      </span>
                    </div>
                    <p className="text-sm text-system-error-50">{setupError}</p>
                    <ControlButton
                      text="Retry Setup"
                      type="default"
                      size="sm"
                      onClick={handleContinueClick}
                      className="w-full"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Panel - Explanation */}
          <div className="w-1/2 bg-white/10 backdrop-blur-md flex items-center justify-center px-[116px] py-[202px]">
            <div className="text-left">
              <span className="text-neutral-grayscale-90 text-[32px] font-bold">
                We're creating your workspace, stages, agents, and storage
                buckets. This will only take a moment.
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render step content functions (preserved original styling)
  const renderStep1 = () => (
    <>
      <div className="space-y-loop-4">
        <img
          src="/images/loopops_icons/loopops_black.svg"
          alt="Loop Ops Logo"
          className="h-[32px] w-auto"
        />
        <h1 className="text-3xl font-bold">
          First off, tell us about yourself
        </h1>
        <p className="text-lg text-neutral-grayscale-70">
          Let's get to know you better so we can personalize your experience.
        </p>
      </div>

      <form onSubmit={(e) => e.preventDefault()} className="space-y-loop-6">
        <div className="space-y-loop-1">
          <label
            htmlFor="name"
            className="ml-loop-4 block text-sm font-medium text-neutral-grayscale-50"
          >
            What should we call you?
          </label>
          <Input
            id="name"
            type="text"
            value={formData.name || ''}
            onChange={handleInputChange('name')}
            className={
              errors.name ? 'border-system-error-50 h-loop-10' : 'h-loop-10'
            }
            placeholder="Name"
            disabled={isLoading}
          />
          {errors.name && (
            <p className="text-sm text-system-error-50">{errors.name}</p>
          )}
        </div>

        <div className="space-y-loop-1">
          <label className="ml-loop-4 block text-sm font-medium text-neutral-grayscale-50">
            What's your role? (Optional)
          </label>
          <CustomSelectFilter
            filterInitialValue="Select your role"
            selectedProperty={selectedRole}
            availableProperties={roleOptionsV2}
            onPropertyChange={handleRoleChange}
            variant="light"
            icon={User}
            classNames="!h-loop-10"
          />
        </div>
      </form>
    </>
  );

  const renderStep2 = () => (
    <>
      <div className="space-y-loop-4">
        <img
          src="/images/loopops_icons/loopops_black.svg"
          alt="Loop Ops Logo"
          className="h-[32px] w-auto"
        />
        <h1 className="text-3xl font-bold">
          Okay {formData.name}, <br />
          Let's set up your workspace
        </h1>
        <p className="text-lg text-neutral-grayscale-70">
          Your workspace is where LoopOps organizes your projects and keeps
          progress on track.
        </p>
      </div>

      <form onSubmit={(e) => e.preventDefault()} className="space-y-loop-6">
        <div className="space-y-loop-1">
          <label
            htmlFor="workspaceName"
            className="ml-loop-4 block text-sm font-medium text-neutral-grayscale-50"
          >
            What's your Company Name?
          </label>
          <Input
            id="workspaceName"
            type="text"
            value={formData.workspaceName || ''}
            onChange={handleInputChange('workspaceName')}
            className={
              errors.workspaceName
                ? 'border-system-error-50 h-loop-10'
                : 'h-loop-10'
            }
            placeholder="Company Name"
            disabled={isLoading}
          />
          {errors.workspaceName && (
            <p className="text-sm text-system-error-50">
              {errors.workspaceName}
            </p>
          )}
        </div>
      </form>
    </>
  );

  const renderStep3 = () => (
    <>
      <div className="space-y-loop-4">
        <img
          src="/images/loopops_icons/loopops_black.svg"
          alt="Loop Ops Logo"
          className="h-[32px] w-auto"
        />
        <h1 className="text-3xl font-bold">
          Now, let's create your first project
        </h1>
        <p className="text-lg text-neutral-grayscale-70">
          Once your project is ready, you'll be able to add all the right
          information to get started.
        </p>
      </div>

      <form onSubmit={(e) => e.preventDefault()} className="space-y-loop-6">
        <div className="space-y-loop-1">
          <label
            htmlFor="projectName"
            className="ml-loop-4 block text-sm font-medium text-neutral-grayscale-50"
          >
            What should we call it?
          </label>
          <Input
            id="projectName"
            type="text"
            value={formData.projectName || ''}
            onChange={handleInputChange('projectName')}
            className={
              errors.projectName
                ? 'border-system-error-50 h-loop-10'
                : 'h-loop-10'
            }
            placeholder="Project Name"
            disabled={isLoading}
          />
          {errors.projectName && (
            <p className="text-sm text-system-error-50">{errors.projectName}</p>
          )}
        </div>
      </form>
    </>
  );

  // Render right panel content based on step
  const renderRightContent = () => {
    const displayName = formData.name?.trim() || 'John Doe';
    const displayRole = formData.role || 'No role selected';

    switch (currentStep) {
      case 1:
        return (
          <div className="relative flex flex-col items-center">
            <div className="relative mb-loop-6">
              <div
                onClick={handleProfilePictureClick}
                className="w-[100px] h-[100px] rounded-full bg-white/10 backdrop-blur-sm border border-neutral-grayscale-70 cursor-pointer overflow-hidden hover:bg-white/20 transition-colors flex items-center justify-center"
              >
                {formData.profilePicture ? (
                  <img
                    src={formData.profilePicture}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User size={40} className="text-neutral-grayscale-90" />
                )}
              </div>
              <div
                onClick={handleProfilePictureClick}
                className="absolute -bottom-1 -right-1 w-loop-8 h-loop-8 bg-brand-accent-50 rounded-full flex items-center justify-center hover:bg-brand-accent-50/90 transition-colors cursor-pointer"
              >
                <Camera size={16} className="text-white" />
              </div>
            </div>

            <div className="text-center w-[150px]">
              <h1 className="text-neutral-grayscale-90 text-lg font-bold mb-loop-1">
                {displayName}
              </h1>
              <p className="text-neutral-grayscale-90 text-lg font-regular">
                {displayRole}
              </p>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="text-left">
            <span className="text-neutral-grayscale-90 text-[32px] font-bold">
              Your workspace is where LoopOps organizes your projects and keeps
              progress on track.
            </span>
          </div>
        );

      case 3:
        return (
          <div className="text-left">
            <span className="text-neutral-grayscale-90 text-[32px] font-bold">
              Once your project is ready, you'll be able to add all the right
              information to get started.
            </span>
          </div>
        );

      default:
        return null;
    }
  };

  const getButtonText = () => {
    switch (currentStep) {
      case 1:
        return isLoading ? 'Saving...' : 'Continue';
      case 2:
        return isLoading ? 'Creating...' : 'Create Workspace';
      case 3:
        return isLoading ? 'Creating...' : 'Create Project';
      default:
        return 'Continue';
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      case 3:
        return renderStep3();
      default:
        return null;
    }
  };

  return (
    <div
      className="min-h-screen w-full bg-cover bg-center flex flex-col items-center justify-center p-loop-8 space-y-loop-8"
      style={{ backgroundImage: "url('/images/background/cover02.png')" }}
    >
      <div className="w-[1120px] h-[644px] rounded-custom shadow-lg overflow-hidden flex">
        {/* Left Panel - Form */}
        <div className="w-1/2 bg-neutral-grayscale-0 p-loop-14 space-y-loop-10">
          {/* Progress Indicators */}
          <div className="flex items-center justify-between">
            {currentStep > 1 && (
              <CircleControlIcon
                icon={<ArrowLeft size={16} />}
                label="Go back"
                onClick={handleBackClick}
                type="gray_black"
                className="cursor-pointer"
              />
            )}

            <div className="flex items-center ml-auto">
              {[1, 2, 3].map((step, index) => (
                <React.Fragment key={step}>
                  <div
                    className={`w-loop-8 h-loop-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      step < currentStep
                        ? 'bg-system-success-50 text-neutral-grayscale-0'
                        : step === currentStep
                          ? 'bg-brand-accent-50 text-neutral-grayscale-0'
                          : 'bg-neutral-grayscale-20 text-neutral-grayscale-60'
                    }`}
                  >
                    {step < currentStep ? '✓' : step}
                  </div>
                  {index < 2 && (
                    <div className="w-loop-5 h-loop-1 border-t-2 border-dotted border-neutral-grayscale-40" />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="space-y-loop-8 px-loop-14 pb-loop-14">
            {renderStepContent()}

            <ControlButton
              text={getButtonText()}
              type="default"
              size="lg"
              onClick={handleContinueClick}
              disabled={isLoading}
              className="!w-full h-loop-10 font-bold text-base"
            />
          </div>
        </div>

        {/* Right Panel - Dynamic Content */}
        <div className="w-1/2 bg-white/10 backdrop-blur-md flex items-center justify-center px-[116px] py-[202px]">
          {renderRightContent()}
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
    </div>
  );
};
