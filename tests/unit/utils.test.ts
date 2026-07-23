import { describe, expect, it } from 'vitest'
import { cn, googleMapsSearchUrl, formatCurrencyJpy } from '@/lib/utils'
import { mapProvider } from '@/services/map-provider'
import { paymentProvider } from '@/services/payment-provider'

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('a', false && 'b', 'c')).toContain('a')
    expect(cn('px-2', 'px-4')).toBe('px-4')
  })
})

describe('maps', () => {
  it('builds google maps search url without scraping', () => {
    const url = googleMapsSearchUrl('Nagoya Station')
    expect(url).toContain('google.com/maps')
    expect(url).toContain(encodeURIComponent('Nagoya Station'))
    expect(mapProvider.searchUrl('Tokyo')).toContain('Tokyo')
  })
})

describe('payment provider', () => {
  it('mvp is manual without card storage', () => {
    expect(paymentProvider.supportsOnlineCharge).toBe(false)
    expect(paymentProvider.name).toBe('manual')
  })
})

describe('formatCurrencyJpy', () => {
  it('formats yen', () => {
    expect(formatCurrencyJpy(null)).toBe('—')
    expect(formatCurrencyJpy(1000)).toMatch(/1/)
  })
})
