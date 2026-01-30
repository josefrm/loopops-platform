import { z } from 'zod';

// Agent creation form validation schema
export const createAgentSchema = z.object({
  name: z
    .string()
    .min(1, 'Agent name is required')
    .min(4, 'Agent name must be at least 4 characters')
    .refine(
      (val) => val.trim().length > 0,
      'Agent name cannot contain only spaces',
    )
    .refine(
      (val) => val.trim().length >= 4,
      'Agent name must be at least 4 characters (excluding spaces)',
    ),

  key: z
    .string()
    .min(1, 'Tag handle is required')
    .max(3, 'Tag handle must not exceed 3 characters')
    .refine(
      (val) => val.trim().length > 0,
      'Tag handle cannot contain only spaces',
    )
    .refine(
      (val) => val.trim().length <= 3,
      'Tag handle must not exceed 3 characters (excluding spaces)',
    ),

  llm_model: z.string().min(1, 'Please select an LLM model'),

  base_agent: z.string().nullable().optional(), // Can be empty

  prompt: z
    .string()
    .min(1, 'Agent prompt is required')
    .refine((val) => val.trim().length > 0, 'Agent prompt cannot be empty'),

  // Optional fields that might be used in the form
  color: z.string().optional(),
  description: z.string().optional(),
  expertise: z.array(z.string()).optional(),
  status: z.string().optional(),

  // Active integrations
  active_integrations: z.array(z.string()).optional(),
});

export type CreateAgentFormData = z.infer<typeof createAgentSchema>;

// Custom validation helper functions
export const validateAgentName = (value: string): string | null => {
  if (!value) return 'Agent name is required';
  if (value.trim().length === 0) return 'Agent name cannot contain only spaces';
  if (value.trim().length < 4)
    return 'Agent name must be at least 4 characters';
  return null;
};

export const validateKey = (value: string): string | null => {
  if (!value) return 'Tag handle is required';
  if (value.trim().length === 0) return 'Tag handle cannot contain only spaces';
  if (value.trim().length > 3) return 'Tag handle must not exceed 3 characters';
  return null;
};

export const validateLLMModel = (value: string | undefined): string | null => {
  if (!value) return 'Please select an LLM model';
  return null;
};

export const validateAgentPrompt = (value: string): string | null => {
  if (!value) return 'Agent prompt is required';
  if (value.trim().length === 0) return 'Agent prompt cannot be empty';
  return null;
};
