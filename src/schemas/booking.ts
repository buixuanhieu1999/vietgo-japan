import { z } from 'zod'

export const serviceTypeSchema = z.enum([
  'airport_transfer',
  'shared_ride',
  'intercity',
  'factory_shuttle',
  'shift_shuttle',
  'private_charter',
  'other',
])

export const bookingFormSchema = z
  .object({
    service_type: serviceTypeSchema,
    ride_preference: z.enum(['shared', 'private', 'either']).default('either'),
    pickup_address: z.string().trim().min(3).max(500),
    pickup_prefecture_id: z.string().uuid().optional().or(z.literal('')),
    pickup_postal_code: z
      .string()
      .trim()
      .max(16)
      .optional()
      .or(z.literal('')),
    dropoff_address: z.string().trim().min(3).max(500),
    dropoff_prefecture_id: z.string().uuid().optional().or(z.literal('')),
    dropoff_postal_code: z.string().trim().max(16).optional().or(z.literal('')),
    airport_id: z.string().uuid().optional().or(z.literal('')),
    pickup_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    pickup_time: z.string().optional().or(z.literal('')),
    flight_number: z.string().trim().max(20).optional().or(z.literal('')),
    flight_arrival_time: z.string().optional().or(z.literal('')),
    terminal: z.enum(['international', 'domestic', 'unknown']).default('unknown'),
    passenger_count: z.coerce.number().int().min(1).max(50),
    adults_count: z.coerce.number().int().min(0).max(50),
    children_count: z.coerce.number().int().min(0).max(50),
    child_seats_needed: z.coerce.number().int().min(0).max(10).default(0),
    large_luggage: z.coerce.number().int().min(0).max(50).default(0),
    cabin_luggage: z.coerce.number().int().min(0).max(50).default(0),
    wheelchair_needed: z.boolean().default(false),
    special_assistance: z.string().max(1000).optional().or(z.literal('')),
    time_flexible: z.boolean().default(false),
    flexible_window_minutes: z.coerce.number().int().min(0).max(720).optional(),
    contact_name: z.string().trim().min(2).max(120),
    contact_phone: z
      .string()
      .trim()
      .regex(/^[0-9+\-\s()]{8,20}$/),
    contact_email: z.string().trim().email().max(200),
    contact_line_id: z.string().trim().max(64).optional().or(z.literal('')),
    customer_notes: z.string().max(2000).optional().or(z.literal('')),
    payment_method: z.enum(['cash', 'bank_transfer', 'office', 'other']).default('cash'),
    privacy_accepted: z.literal(true),
    terms_accepted: z.literal(true),
    turnstile_token: z.string().optional(),
  })
  .refine((d) => d.adults_count + d.children_count === d.passenger_count, {
    message: 'passenger_sum_mismatch',
    path: ['passenger_count'],
  })

export type BookingFormValues = z.infer<typeof bookingFormSchema>

export const lookupBookingSchema = z.object({
  booking_code: z.string().trim().min(4).max(32),
  contact: z.string().trim().min(3).max(200),
  turnstile_token: z.string().optional(),
})

export type LookupBookingValues = z.infer<typeof lookupBookingSchema>
