import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { PageMeta } from '@/components/seo/PageMeta'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { Spinner } from '@/components/ui/spinner'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/providers/AuthProvider'
import { tryGetSupabase } from '@/lib/supabase'
import type { Booking } from '@/types/database'
import { Link } from 'react-router-dom'
import { formatDate } from '@/lib/utils'

export function CustomerHomePage() {
  const { t } = useTranslation(['pages', 'common'])
  const { user } = useAuth()
  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ['my-bookings', user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const supabase = tryGetSupabase()
      if (!supabase || !user) return [] as Booking[]
      const { data, error } = await supabase
        .from('bookings')
        .select(
          'id, booking_code, status, service_type, pickup_address, dropoff_address, pickup_date, pickup_time, passenger_count, payment_status, quoted_price_jpy, created_at, updated_at, contact_name, contact_phone, contact_email, user_id, ride_preference, adults_count, children_count',
        )
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10)
      if (error) throw error
      return (data ?? []) as Booking[]
    },
  })

  const upcoming = bookings.filter(
    (b) => !['completed', 'cancelled_by_customer', 'cancelled_by_operator', 'rejected', 'no_show'].includes(b.status),
  )

  return (
    <>
      <PageMeta title={t('customer.title')} path="/tai-khoan" noIndex />
      <h1 className="text-2xl font-bold">{t('customer.title')}</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="py-5">
            <p className="text-sm text-navy-500">{t('customer.upcoming')}</p>
            <p className="text-3xl font-bold text-navy-900">{upcoming.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-5">
            <p className="text-sm text-navy-500">{t('customer.history')}</p>
            <p className="text-3xl font-bold text-navy-900">{bookings.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col justify-center gap-2 py-5">
            <Link to="/dat-xe" className="font-medium text-brand-700 hover:underline">
              {t('cta.bookNow', { ns: 'common' })}
            </Link>
            <Link to="/ho-tro-ho-so" className="font-medium text-navy-700 hover:underline">
              {t('customer.tickets')}
            </Link>
          </CardContent>
        </Card>
      </div>
      <h2 className="mt-10 text-xl font-semibold">{t('customer.upcoming')}</h2>
      {isLoading ? <Spinner className="mt-4" /> : null}
      {!isLoading && upcoming.length === 0 ? (
        <EmptyState
          title={t('status.empty', { ns: 'common' })}
          action={
            <Link to="/dat-xe" className="text-brand-700 underline">
              {t('cta.bookNow', { ns: 'common' })}
            </Link>
          }
        />
      ) : (
        <ul className="mt-4 space-y-3">
          {upcoming.map((b) => (
            <li key={b.id}>
              <Card>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                  <div>
                    <p className="font-semibold">{b.booking_code}</p>
                    <p className="text-sm text-navy-600">
                      {formatDate(b.pickup_date)} · {b.pickup_address}
                    </p>
                  </div>
                  <Badge>{t(`bookingStatus.${b.status}`, { ns: 'common' })}</Badge>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

export function CustomerBookingsPage() {
  const { t } = useTranslation(['pages', 'common'])
  const { user } = useAuth()
  const { data: bookings = [], isLoading, isError } = useQuery({
    queryKey: ['my-bookings-all', user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const supabase = tryGetSupabase()
      if (!supabase || !user) return [] as Booking[]
      const { data, error } = await supabase
        .from('bookings')
        .select(
          'id, booking_code, status, service_type, pickup_address, dropoff_address, pickup_date, pickup_time, passenger_count, payment_status, quoted_price_jpy, created_at, updated_at, contact_name, contact_phone, contact_email, user_id, ride_preference, adults_count, children_count',
        )
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as Booking[]
    },
  })

  return (
    <>
      <PageMeta title={t('customer.bookings')} path="/tai-khoan/booking" noIndex />
      <h1 className="text-2xl font-bold">{t('customer.bookings')}</h1>
      {isLoading ? <Spinner className="mt-6" /> : null}
      {isError ? (
        <Alert variant="error" className="mt-4">
          {t('status.error', { ns: 'common' })}
        </Alert>
      ) : null}
      {!isLoading && bookings.length === 0 ? (
        <EmptyState title={t('status.empty', { ns: 'common' })} />
      ) : (
        <div className="mt-6 space-y-3">
          {bookings.map((b) => (
            <Card key={b.id}>
              <CardContent className="py-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <strong>{b.booking_code}</strong>
                  <Badge>{t(`bookingStatus.${b.status}`, { ns: 'common' })}</Badge>
                </div>
                <p className="mt-2 text-sm text-navy-700">
                  {t(`serviceTypes.${b.service_type}`, { ns: 'common' })} · {formatDate(b.pickup_date)}
                </p>
                <p className="text-sm text-navy-600">
                  {b.pickup_address} → {b.dropoff_address}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  )
}

export function CustomerSupportPage() {
  const { t } = useTranslation(['pages', 'common'])
  const { user } = useAuth()
  const { data = [], isLoading } = useQuery({
    queryKey: ['my-support', user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const supabase = tryGetSupabase()
      if (!supabase || !user) return []
      const { data: rows, error } = await supabase
        .from('support_requests')
        .select('id, request_code, title, status, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return rows ?? []
    },
  })

  return (
    <>
      <PageMeta title={t('customer.tickets')} path="/tai-khoan/ho-tro" noIndex />
      <h1 className="text-2xl font-bold">{t('customer.tickets')}</h1>
      <Link to="/ho-tro-ho-so" className="mt-2 inline-block text-brand-700 hover:underline">
        + {t('nav.support', { ns: 'common' })}
      </Link>
      {isLoading ? <Spinner className="mt-6" /> : null}
      <ul className="mt-6 space-y-3">
        {data.map((r) => (
          <li key={r.id}>
            <Card>
              <CardContent className="flex justify-between gap-3 py-4">
                <div>
                  <p className="font-semibold">{r.request_code}</p>
                  <p className="text-sm text-navy-600">{r.title}</p>
                </div>
                <Badge>{r.status}</Badge>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
      {!isLoading && data.length === 0 ? (
        <EmptyState title={t('status.empty', { ns: 'common' })} />
      ) : null}
    </>
  )
}

export function CustomerNotificationsPage() {
  const { t } = useTranslation(['pages', 'common'])
  const { user } = useAuth()
  const { data = [], isLoading } = useQuery({
    queryKey: ['notifications', user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const supabase = tryGetSupabase()
      if (!supabase || !user) return []
      const { data: rows, error } = await supabase
        .from('notifications')
        .select('id, title, body, is_read, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) throw error
      return rows ?? []
    },
  })

  return (
    <>
      <PageMeta title={t('customer.notifications')} path="/tai-khoan/thong-bao" noIndex />
      <h1 className="text-2xl font-bold">{t('customer.notifications')}</h1>
      {isLoading ? <Spinner className="mt-6" /> : null}
      <ul className="mt-6 space-y-3">
        {data.map((n) => (
          <li key={n.id}>
            <Card className={n.is_read ? 'opacity-70' : ''}>
              <CardContent className="py-4">
                <p className="font-semibold">{n.title}</p>
                <p className="text-sm text-navy-600">{n.body}</p>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
      {!isLoading && data.length === 0 ? (
        <EmptyState title={t('status.empty', { ns: 'common' })} />
      ) : null}
    </>
  )
}

export function CustomerProfilePage() {
  const { t } = useTranslation(['pages', 'forms', 'common'])
  const { profile, user, refreshProfile } = useAuth()
  const form = useForm({
    defaultValues: {
      full_name: profile?.full_name ?? '',
      phone: profile?.phone ?? '',
      line_id: profile?.line_id ?? '',
    },
  })

  const onSubmit = form.handleSubmit(async (values) => {
    const supabase = tryGetSupabase()
    if (!supabase || !user) return
    await supabase
      .from('profiles')
      .update({
        full_name: values.full_name,
        phone: values.phone,
        line_id: values.line_id,
      })
      .eq('id', user.id)
    await refreshProfile()
  })

  return (
    <>
      <PageMeta title={t('customer.profile')} path="/tai-khoan/ho-so" noIndex />
      <h1 className="text-2xl font-bold">{t('customer.profile')}</h1>
      <Card className="mt-6 max-w-lg">
        <CardHeader>
          <CardTitle>{user?.email}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label htmlFor="full_name">{t('auth.fullName', { ns: 'forms' })}</Label>
              <Input id="full_name" {...form.register('full_name')} />
            </div>
            <div>
              <Label htmlFor="phone">{t('auth.phone', { ns: 'forms' })}</Label>
              <Input id="phone" {...form.register('phone')} />
            </div>
            <div>
              <Label htmlFor="line_id">LINE ID</Label>
              <Input id="line_id" {...form.register('line_id')} />
            </div>
            <Button type="submit">{t('cta.save', { ns: 'common' })}</Button>
          </form>
        </CardContent>
      </Card>
    </>
  )
}
