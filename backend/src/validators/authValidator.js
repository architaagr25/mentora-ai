import { z } from 'zod'

export const registerSchema = z.object({
  name: z
    .string({ required_error: 'Name is required' })
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name cannot exceed 50 characters')
    .trim(),

  email: z
    .string({ required_error: 'Email is required' })
    .email('Please enter a valid email')
    .toLowerCase(),

  password: z
    .string({ required_error: 'Password is required' })
    .min(8, 'Password must be at least 8 characters')
    .max(72, 'Password cannot exceed 72 characters'),
    // 72 is bcrypt's maximum input length — anything beyond is silently truncated
})

export const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .email('Please enter a valid email')
    .toLowerCase(),

  password: z
    .string({ required_error: 'Password is required' })
    .min(1, 'Password is required'),
    // On login we don't enforce complexity — just that something was sent
    // The hash comparison will fail naturally if it's wrong
})