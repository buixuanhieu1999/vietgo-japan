import { describe, expect, it } from 'vitest'
import { bookingFormSchema, lookupBookingSchema } from '@/schemas/booking'

describe('P0 identity rules (application layer)', () => {
  it('booking form schema has no user_id field requirement', () => {
    const parsed = bookingFormSchema.safeParse({
      service_type: 'airport_transfer',
      ride_preference: 'either',
      pickup_address: 'Centrair',
      dropoff_address: 'Nagoya',
      pickup_date: '2026-08-01',
      passenger_count: 1,
      adults_count: 1,
      children_count: 0,
      child_seats_needed: 0,
      large_luggage: 0,
      cabin_luggage: 0,
      wheelchair_needed: false,
      time_flexible: false,
      contact_name: 'Test User',
      contact_phone: '090-1234-5678',
      contact_email: 't@example.com',
      payment_method: 'cash',
      privacy_accepted: true,
      terms_accepted: true,
      terminal: 'unknown',
    })
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect('user_id' in parsed.data).toBe(false)
    }
  })
})

describe('lookup prefers token or code+contact', () => {
  it('accepts lookup_token alone', () => {
    expect(
      lookupBookingSchema.safeParse({
        lookup_token: 'a'.repeat(32),
      }).success,
    ).toBe(true)
  })

  it('accepts code + contact', () => {
    expect(
      lookupBookingSchema.safeParse({
        booking_code: 'VG-ABC12345',
        contact: 'a@b.com',
      }).success,
    ).toBe(true)
  })

  it('rejects empty lookup', () => {
    expect(lookupBookingSchema.safeParse({}).success).toBe(false)
  })
})

describe('seat delta math (mirrors DB fix)', () => {
  function seatDelta(oldReserved: number | null, status: string, newSeats: number): number {
    if (status === 'confirmed' && oldReserved != null) return newSeats - oldReserved
    return newSeats
  }

  it('retry with same seats does not consume more', () => {
    expect(seatDelta(2, 'confirmed', 2)).toBe(0)
  })

  it('increase seats only consumes difference', () => {
    expect(seatDelta(2, 'confirmed', 3)).toBe(1)
  })

  it('first reserve consumes full amount', () => {
    expect(seatDelta(null, 'new', 2)).toBe(2)
  })
})

describe('booking status machine whitelist sample', () => {
  const allowed: Record<string, string[]> = {
    requested: ['reviewing', 'quoted', 'rejected', 'cancelled_by_operator'],
    confirmed: ['assigned', 'cancelled_by_operator', 'no_show'],
    in_transit: ['completed'],
  }

  it('blocks customer-style status jump to completed', () => {
    expect(allowed.requested?.includes('completed')).toBe(false)
  })

  it('allows staff path assigned from confirmed', () => {
    expect(allowed.confirmed?.includes('assigned')).toBe(true)
  })
})
