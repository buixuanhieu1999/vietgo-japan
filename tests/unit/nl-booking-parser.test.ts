import { describe, expect, it } from 'vitest'
import { parseBookingNaturalLanguage } from '@/services/nl-booking-parser'

describe('parseBookingNaturalLanguage', () => {
  it('parses airport transfer style Vietnamese text', () => {
    const d = parseBookingNaturalLanguage(
      'Đón tôi ở Narita ngày 14/8/2026 lúc 18:00, 3 người, 4 vali, đi Nagoya.',
    )
    expect(d.pickup_address).toMatch(/Narita/i)
    expect(d.dropoff_address).toMatch(/Nagoya/i)
    expect(d.pickup_date).toBe('2026-08-14')
    expect(d.pickup_time).toBe('18:00')
    expect(d.passenger_count).toBe(3)
    expect(d.large_luggage).toBe(4)
    expect(d.service_type).toBe('airport_transfer')
    expect(d.confidence).toBe('high')
  })

  it('never auto-submits — only draft fields', () => {
    const d = parseBookingNaturalLanguage('Centrair to Gifu')
    expect(d).not.toHaveProperty('status')
    expect(d.warnings.length).toBeGreaterThanOrEqual(0)
  })

  it('returns low confidence on empty', () => {
    expect(parseBookingNaturalLanguage('').confidence).toBe('low')
  })
})
