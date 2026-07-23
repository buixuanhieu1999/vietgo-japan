import { describe, expect, it } from 'vitest'
import { bookingFormSchema, lookupBookingSchema } from '@/schemas/booking'

describe('bookingFormSchema', () => {
  const valid = {
    service_type: 'airport_transfer' as const,
    ride_preference: 'either' as const,
    pickup_address: 'Centrair Terminal 1',
    dropoff_address: 'Nagoya Station',
    pickup_date: '2026-08-01',
    passenger_count: 2,
    adults_count: 2,
    children_count: 0,
    child_seats_needed: 0,
    large_luggage: 1,
    cabin_luggage: 1,
    wheelchair_needed: false,
    time_flexible: false,
    contact_name: 'Nguyen Van A',
    contact_phone: '090-1234-5678',
    contact_email: 'a@example.com',
    payment_method: 'cash' as const,
    privacy_accepted: true as const,
    terms_accepted: true as const,
    terminal: 'international' as const,
  }

  it('accepts a valid booking payload', () => {
    const result = bookingFormSchema.safeParse(valid)
    expect(result.success).toBe(true)
  })

  it('rejects passenger sum mismatch', () => {
    const result = bookingFormSchema.safeParse({
      ...valid,
      passenger_count: 3,
      adults_count: 1,
      children_count: 1,
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing privacy acceptance', () => {
    const result = bookingFormSchema.safeParse({
      ...valid,
      privacy_accepted: false,
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid phone', () => {
    const result = bookingFormSchema.safeParse({
      ...valid,
      contact_phone: 'abc',
    })
    expect(result.success).toBe(false)
  })
})

describe('lookupBookingSchema', () => {
  it('requires code and contact', () => {
    expect(lookupBookingSchema.safeParse({ booking_code: '', contact: '' }).success).toBe(false)
    expect(
      lookupBookingSchema.safeParse({ booking_code: 'VG-ABC12345', contact: 'a@b.com' }).success,
    ).toBe(true)
  })
})
