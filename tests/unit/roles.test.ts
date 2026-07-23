import { describe, expect, it } from 'vitest'
import type { AppRole, BookingStatus, VerificationStatus } from '@/types/database'

const STAFF: AppRole[] = ['support_agent', 'dispatcher', 'admin', 'super_admin']

function canViewBooking(viewer: AppRole | 'guest', ownerId: string, viewerId: string): boolean {
  if (viewer === 'guest') return false
  if (viewer === 'customer') return ownerId === viewerId
  if (STAFF.includes(viewer) || viewer === 'driver') return true
  return false
}

function driverCanViewTrip(assignedDriverUserId: string | null, viewerId: string): boolean {
  return assignedDriverUserId === viewerId
}

function isPublicLicensedClaimAllowed(status: VerificationStatus, publiclyListed: boolean): boolean {
  return status === 'verified' && publiclyListed
}

const TERMINAL_STATUSES: BookingStatus[] = [
  'completed',
  'cancelled_by_customer',
  'cancelled_by_operator',
  'rejected',
  'no_show',
]

describe('role permissions (application rules)', () => {
  it('customer only sees own booking', () => {
    expect(canViewBooking('customer', 'u1', 'u1')).toBe(true)
    expect(canViewBooking('customer', 'u1', 'u2')).toBe(false)
    expect(canViewBooking('guest', 'u1', '')).toBe(false)
  })

  it('driver only sees assigned trip', () => {
    expect(driverCanViewTrip('d1', 'd1')).toBe(true)
    expect(driverCanViewTrip('d1', 'd2')).toBe(false)
    expect(driverCanViewTrip(null, 'd1')).toBe(false)
  })

  it('never claims licensed publicly without verified + listed', () => {
    expect(isPublicLicensedClaimAllowed('pending', true)).toBe(false)
    expect(isPublicLicensedClaimAllowed('verified', false)).toBe(false)
    expect(isPublicLicensedClaimAllowed('verified', true)).toBe(true)
  })

  it('terminal booking statuses are defined', () => {
    expect(TERMINAL_STATUSES).toContain('completed')
  })
})

describe('seat reservation safety (logic)', () => {
  function reserve(available: number, seats: number): number {
    if (seats <= 0) throw new Error('invalid_seat_count')
    if (available < seats) throw new Error('insufficient_seats')
    return available - seats
  }

  it('prevents overbooking', () => {
    expect(reserve(3, 2)).toBe(1)
    expect(() => reserve(1, 2)).toThrow('insufficient_seats')
  })
})
