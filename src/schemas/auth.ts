import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8).max(128),
})

export const registerSchema = z
  .object({
    full_name: z.string().trim().min(2).max(120),
    email: z.string().trim().email(),
    phone: z
      .string()
      .trim()
      .regex(/^[0-9+\-\s()]{8,20}$/)
      .optional()
      .or(z.literal('')),
    password: z.string().min(8).max(128),
    confirm_password: z.string().min(8).max(128),
    privacy_accepted: z.literal(true),
    turnstile_token: z.string().optional(),
  })
  .refine((d) => d.password === d.confirm_password, {
    message: 'password_mismatch',
    path: ['confirm_password'],
  })

export const contactSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email(),
  phone: z.string().trim().max(20).optional().or(z.literal('')),
  subject: z.string().trim().min(3).max(200),
  message: z.string().trim().min(10).max(5000),
  turnstile_token: z.string().optional(),
})

export const supportRequestSchema = z.object({
  service_type_id: z.string().uuid(),
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().min(10).max(5000),
  contact_name: z.string().trim().min(2).max(120),
  contact_phone: z
    .string()
    .trim()
    .regex(/^[0-9+\-\s()]{8,20}$/),
  contact_email: z.string().trim().email(),
  privacy_accepted: z.literal(true),
  turnstile_token: z.string().optional(),
})

export type LoginValues = z.infer<typeof loginSchema>
export type RegisterValues = z.infer<typeof registerSchema>
export type ContactValues = z.infer<typeof contactSchema>
export type SupportRequestValues = z.infer<typeof supportRequestSchema>
