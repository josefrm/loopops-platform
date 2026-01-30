import { z } from 'zod';
import { Agent } from '@/models/Agent';

// Zod schema for team validation
export const createTeamSchema = z.object({
  team_name: z
    .string()
    .min(1, 'Team name is required')
    .min(3, 'Team name must be at least 3 characters long')
    .refine((value) => value.trim().length > 0, {
      message: 'Team name cannot contain only spaces',
    })
    .refine((value) => value.trim().length >= 3, {
      message:
        'Team name must be at least 3 characters long (excluding spaces)',
    }),

  prompt: z
    .string()
    .min(1, 'Team instructions are required')
    .refine((value) => value.trim().length > 0, {
      message: 'Team instructions cannot be empty or contain only spaces',
    }),

  agents: z
    .array(z.any())
    .min(1, 'At least one agent must be selected for the team')
    .refine((agents) => agents && agents.length > 0, {
      message: 'A team must have at least one agent',
    }),
});

// TypeScript type for form data
export type CreateTeamFormData = z.infer<typeof createTeamSchema>;

// Individual validation helpers
export const validateTeamName = (teamName: string): string | null => {
  if (!teamName || teamName.trim().length === 0) {
    return 'Team name is required';
  }
  if (teamName.trim().length < 3) {
    return 'Team name must be at least 3 characters long';
  }
  return null;
};

export const validatePrompt = (prompt: string): string | null => {
  if (!prompt || prompt.trim().length === 0) {
    return 'Team instructions are required';
  }
  return null;
};

export const validateAgents = (agents: Agent[]): string | null => {
  if (!agents || agents.length === 0) {
    return 'At least one agent must be selected';
  }
  return null;
};
