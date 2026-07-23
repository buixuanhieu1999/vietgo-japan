import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router-dom'
import { PageMeta } from '@/components/seo/PageMeta'
import { BookingForm } from '@/features/bookings/BookingForm'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { TurnstileWidget } from '@/components/turnstile/TurnstileWidget'
import { lookupBookingSchema, type LookupBookingValues } from '@/schemas/booking'
import { invokeFunction, tryGetSupabase } from '@/lib/supabase'
import type { BookingStatus } from '@/types/database'

export function BookPage() {
  const { t } = useTranslation('pages')
  return (
    <>
      <PageMeta title={t('book.title')} description={t('book.meta')} path="/dat-xe" />
      <div className="container-app py-10">
        <h1 className="text-3xl font-bold">{t('book.title')}</h1>
        <Card className="mt-8 max-w-3xl">
          <CardContent className="py-6">
            <BookingForm />
          </CardContent>
        </Card>
      </div>
    </>
  )
}

export function BookSuccessPage() {
  const { t } = useTranslation(['pages', 'common'])
  const location = useLocation()
  const state = location.state as {
    bookingCode?: string
    lookupToken?: string
  } | null
  const bookingCode = state?.bookingCode ?? null
  const lookupToken = state?.lookupToken ?? null

  return (
    <>
      <PageMeta title={t('book.successTitle')} path="/dat-xe/thanh-cong" noIndex />
      <div className="container-app py-16">
        <Card className="mx-auto max-w-lg text-center">
          <CardHeader>
            <CardTitle>{t('book.successTitle')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-navy-700">{t('book.successBody')}</p>
            {bookingCode ? (
              <div className="space-y-2">
                <p className="rounded-lg bg-navy-50 px-4 py-3 text-2xl font-bold tracking-wide text-navy-900">
                  {t('book.bookingCode')}: {bookingCode}
                </p>
                {lookupToken ? (
                  <p className="break-all rounded-lg border border-navy-100 px-3 py-2 text-left text-xs text-navy-600">
                    Lookup token (giữ riêng tư):{' '}
                    <span className="font-mono">{lookupToken}</span>
                  </p>
                ) : null}
              </div>
            ) : (
              <Alert variant="warning">
                Không tìm thấy mã trong phiên hiện tại. Kiểm tra email hoặc tra cứu booking.
              </Alert>
            )}
            <p className="text-sm text-navy-600">{t('book.notConfirmation')}</p>
            <div className="flex flex-wrap justify-center gap-3 pt-2">
              <Link
                to="/tra-cuu-booking"
                className="inline-flex h-11 items-center rounded-lg bg-navy-900 px-5 text-white"
              >
                {t('nav.lookup', { ns: 'common' })}
              </Link>
              <Link
                to="/"
                className="inline-flex h-11 items-center rounded-lg border-2 border-navy-900 px-5"
              >
                {t('nav.home', { ns: 'common' })}
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}

interface LookupResult {
  booking_code: string
  status: BookingStatus
  service_type: string
  pickup_address: string
  dropoff_address: string
  pickup_date: string
  pickup_time: string | null
  passenger_count: number
  payment_status: string
  quoted_price_jpy: number | null
}

export function LookupPage() {
  const { t } = useTranslation(['pages', 'forms', 'common'])
  const [result, setResult] = useState<LookupResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const form = useForm<LookupBookingValues & { lookup_token?: string }>({
    resolver: zodResolver(lookupBookingSchema) as never,
    defaultValues: {
      booking_code: '',
      contact: '',
      turnstile_token: '',
      lookup_token: '',
    },
  })

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null)
    setResult(null)
    if (!tryGetSupabase()) {
      setError(t('status.notConfigured', { ns: 'common' }))
      return
    }
    try {
      const token = values.lookup_token?.trim()
      const res = await invokeFunction<{ booking: LookupResult }>('lookup-booking', {
        turnstile_token: values.turnstile_token,
        ...(token
          ? { lookup_token: token }
          : { booking_code: values.booking_code, contact: values.contact }),
      })
      setResult(res.booking)
    } catch {
      setError(t('errors.generic', { ns: 'forms' }))
    }
  })

  return (
    <>
      <PageMeta title={t('lookup.title')} description={t('lookup.meta')} path="/tra-cuu-booking" />
      <div className="container-app py-10">
        <h1 className="text-3xl font-bold">{t('lookup.title')}</h1>
        <p className="mt-3 text-navy-700">{t('lookup.hint')}</p>
        <Card className="mt-8 max-w-lg">
          <CardContent className="space-y-4 py-6">
            {error ? <Alert variant="error">{error}</Alert> : null}
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <Label htmlFor="lookup_token">Lookup token (khuyến nghị)</Label>
                <Input id="lookup_token" {...form.register('lookup_token')} autoComplete="off" />
              </div>
              <p className="text-xs text-navy-500">
                Hoặc tra cứu bằng mã booking + email/SĐT (có giới hạn tần suất).
              </p>
              <div>
                <Label htmlFor="booking_code">{t('lookup.code', { ns: 'forms' })}</Label>
                <Input id="booking_code" {...form.register('booking_code')} />
              </div>
              <div>
                <Label htmlFor="contact">{t('lookup.contact', { ns: 'forms' })}</Label>
                <Input id="contact" {...form.register('contact')} />
              </div>
              <TurnstileWidget onToken={(tok) => form.setValue('turnstile_token', tok)} />
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? <Spinner /> : null}
                {t('lookup.submit', { ns: 'forms' })}
              </Button>
            </form>
            {result ? (
              <div className="rounded-lg border border-navy-100 bg-navy-50 p-4 text-left">
                <div className="flex flex-wrap items-center gap-2">
                  <strong className="text-lg">{result.booking_code}</strong>
                  <Badge>
                    {t(`bookingStatus.${result.status}`, { ns: 'common' })}
                  </Badge>
                </div>
                <dl className="mt-3 space-y-1 text-sm text-navy-800">
                  <div>
                    <dt className="inline font-medium">Pickup: </dt>
                    <dd className="inline">{result.pickup_address}</dd>
                  </div>
                  <div>
                    <dt className="inline font-medium">Dropoff: </dt>
                    <dd className="inline">{result.dropoff_address}</dd>
                  </div>
                  <div>
                    <dt className="inline font-medium">Date: </dt>
                    <dd className="inline">
                      {result.pickup_date}
                      {result.pickup_time ? ` ${result.pickup_time}` : ''}
                    </dd>
                  </div>
                  <div>
                    <dt className="inline font-medium">Passengers: </dt>
                    <dd className="inline">{result.passenger_count}</dd>
                  </div>
                </dl>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
