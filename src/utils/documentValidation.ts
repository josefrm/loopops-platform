import { z } from 'zod';

// Document upload form validation schema
export const documentUploadSchema = z.object({
  name: z
    .string()
    .min(3, 'Document name must be at least 3 characters long')
    .refine(
      (val) => val.trim().length > 0,
      'Document name cannot contain only spaces',
    ),

  description: z
    .string()
    .max(255, 'Description must not exceed 255 characters')
    .refine(
      (val) => val.length === 0 || val.trim().length > 0,
      'Description cannot contain only spaces',
    ),

  category: z
    .object({
      key: z.string(),
      name: z.string(),
      description: z.string(),
    })
    .nullable()
    .refine((val) => val !== null, 'Category must be selected'),
});

export type DocumentUploadFormData = z.infer<typeof documentUploadSchema>;

// Custom validation helper functions
export const validateDocumentName = (value: string): string | null => {
  if (!value) return 'Document name is required';
  if (value.trim().length === 0)
    return 'Document name cannot contain only spaces';
  return null;
};

export const validateDocumentDescription = (value: string): string | null => {
  if (value.length > 255) return 'Description must not exceed 255 characters';
  if (value.length > 0 && value.trim().length === 0) {
    return 'Description cannot contain only spaces';
  }
  return null;
};

export const validateDocumentCategory = (value: any): string | null => {
  if (!value) return 'Category must be selected';
  return null;
};

// Helper function to check if document has validation errors
export const hasDocumentValidationErrors = (
  name: string,
  description: string,
  category: any,
): boolean => {
  return !!(
    validateDocumentName(name) ||
    validateDocumentDescription(description) ||
    validateDocumentCategory(category)
  );
};
