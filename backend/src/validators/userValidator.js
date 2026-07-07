// backend/src/validators/userValidator.js
import { z } from 'zod'

// ─────────────────────────────────────────
// UPDATE PROFILE
// Name and email are both optional here since a user might
// only want to change one of the two. At least one must be
// provided — enforced via .refine() below.
// ─────────────────────────────────────────
export const updateProfileSchema = z
  .object({
    name: z
      .string()
      .min(2, 'Name must be at least 2 characters')
      .max(50, 'Name cannot exceed 50 characters')
      .trim()
      .optional(),

    email: z
      .string()
      .email('Please enter a valid email')
      .toLowerCase()
      .optional(),
  })
  .refine((data) => data.name !== undefined || data.email !== undefined, {
    message: 'Provide at least a name or email to update',
  })

// ─────────────────────────────────────────
// CHANGE PASSWORD
// currentPassword is required so someone with a stolen/left-open
// session can't silently take over the account by just setting a
// new password — they must know the existing one.
// ─────────────────────────────────────────
export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string({ required_error: 'Current password is required' })
      .min(1, 'Current password is required'),

    newPassword: z
      .string({ required_error: 'New password is required' })
      .min(8, 'New password must be at least 8 characters')
      .max(72, 'New password cannot exceed 72 characters'),
      // 72 char cap matches bcrypt's input limit, same as registerSchema
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'New password must be different from current password',
    path: ['newPassword'],
  })