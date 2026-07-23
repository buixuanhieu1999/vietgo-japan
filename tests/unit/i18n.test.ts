import { describe, expect, it } from 'vitest'
import viCommon from '@/locales/vi/common.json'
import jaCommon from '@/locales/ja/common.json'
import viPages from '@/locales/vi/pages.json'
import jaPages from '@/locales/ja/pages.json'

describe('i18n locales', () => {
  it('has matching top-level keys for common', () => {
    expect(Object.keys(viCommon).sort()).toEqual(Object.keys(jaCommon).sort())
  })

  it('has app name and slogan', () => {
    expect(viCommon.appName).toBe('VietGo Japan')
    expect(jaCommon.appName).toBe('VietGo Japan')
    expect(viCommon.slogan.length).toBeGreaterThan(10)
  })

  it('pages have home and legal keys', () => {
    expect(viPages.home).toBeTruthy()
    expect(jaPages.home).toBeTruthy()
    expect(viPages.legal.antiIllegal).toBeTruthy()
  })
})
