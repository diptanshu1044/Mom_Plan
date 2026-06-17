import { z } from 'zod';
import { orgTypeSchema } from '../../constants/org-types';

export const registerSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8),
    full_name: z.string().min(1),
    phone: z
      .string()
      .optional()
      .refine((val) => !val || /^\+1\d{10}$/.test(val), {
        message: 'Enter a valid US phone number',
      }),
    partner_org_id: z.string().uuid('Please select a valid partner organization').optional(),
    org_type: orgTypeSchema.nullable().or(z.literal('')).optional(),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string(),
  }),
});

export const changePasswordSchema = z.object({
  body: z.object({
    current_password: z.string().min(1),
    new_password: z.string().min(8),
  }),
});

export const refreshSchema = z.object({
  body: z.object({
    refreshToken: z.string().optional(),
  }),
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email(),
  }),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(1),
    newPassword: z.string().min(8),
  }),
});
