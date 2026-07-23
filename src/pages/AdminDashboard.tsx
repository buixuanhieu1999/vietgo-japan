import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { PageMeta } from '@/components/seo/PageMeta'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { EmptyState } from '@/components/ui/empty-state'
import { Alert } from '@/components/ui/alert'
import { tryGetSupabase } from '@/lib/supabase'
import { formatDate } from '@/lib/utils'

function useAdminCount(table: string, filters?: { column: string; value: string }) {
  return useQuery({
    queryKey: ['admin-count', table, filters],
    queryFn: async () => {
      const supabase = tryGetSupabase()
      if (!supabase) return 0
      let q = supabase.from(table as 'bookings').select('id', { count: 'exact', head: true })
      if (filters) q = q.eq(filters.column as 'status', filters.value)
      const { count, error } = await q
      if (error) throw error
      return count ?? 0
    },
  })
}

export function AdminHomePage() {
  const { t } = useTranslation(['pages', 'common'])
  const total = useAdminCount('bookings')
  const pending = useAdminCount('bookings', { column: 'status', value: 'requested' })
  const support = useAdminCount('support_requests', { column: 'status', value: 'submitted' })

  const today = new Date().toISOString().slice(0, 10)
  const todayQ = useQuery({
    queryKey: ['bookings-today', today],
    queryFn: async () => {
      const supabase = tryGetSupabase()
      if (!supabase) return 0
      const { count, error } = await supabase
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .eq('pickup_date', today)
      if (error) throw error
      return count ?? 0
    },
  })

  return (
    <>
      <PageMeta title={t('admin.title')} path="/quan-tri" noIndex />
      <h1 className="text-2xl font-bold">{t('admin.title')}</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: t('admin.overview'), value: total.data ?? '—' },
          { label: t('admin.today'), value: todayQ.data ?? '—' },
          { label: t('admin.pending'), value: pending.data ?? '—' },
          { label: t('admin.support'), value: support.data ?? '—' },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="py-5">
              <p className="text-sm text-navy-500">{s.label}</p>
              <p className="text-3xl font-bold">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Alert className="mt-8" variant="info">
        Doanh thu thủ công và giấy phép sắp hết hạn xem tại các tab tương ứng. Không hiển thị tuyên
        bố cấp phép công khai khi chưa xác minh.
      </Alert>
    </>
  )
}

export function AdminBookingsPage() {
  const { t } = useTranslation(['pages', 'common'])
  const [suggestFor, setSuggestFor] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<
    Array<{
      trip_id: string
      departure_date: string
      seats_available: number
      distance_to_pickup_m: number | null
      operator_verified: boolean
    }>
  >([])
  const [suggestError, setSuggestError] = useState<string | null>(null)

  const { data = [], isLoading, isError } = useQuery({
    queryKey: ['admin-bookings'],
    queryFn: async () => {
      const supabase = tryGetSupabase()
      if (!supabase) return []
      const { data: rows, error } = await supabase
        .from('bookings')
        .select(
          'id, booking_code, status, service_type, pickup_date, contact_name, contact_phone, pickup_address, created_at',
        )
        .order('created_at', { ascending: false })
        .limit(100)
      if (error) throw error
      return rows ?? []
    },
  })

  const runSuggest = async (bookingId: string) => {
    setSuggestFor(bookingId)
    setSuggestError(null)
    setSuggestions([])
    const supabase = tryGetSupabase()
    if (!supabase) return
    const { data: rows, error } = await supabase.rpc('suggest_trips_for_booking', {
      p_booking_id: bookingId,
      p_max_distance_m: 80000,
      p_limit: 8,
    })
    if (error) {
      setSuggestError(error.message)
      return
    }
    setSuggestions((rows ?? []) as typeof suggestions)
  }

  return (
    <>
      <PageMeta title={t('admin.bookings')} path="/quan-tri/booking" noIndex />
      <h1 className="text-2xl font-bold">{t('admin.bookings')}</h1>
      <Alert className="mt-4" variant="info">
        Gợi ý chuyến (PostGIS + ràng buộc cứng: seats, luggage, verified operator/driver/vehicle). Không
        dùng LLM để ghép chuyến.
      </Alert>
      {isLoading ? <Spinner className="mt-6" /> : null}
      {isError ? (
        <Alert variant="error" className="mt-4">
          {t('status.error', { ns: 'common' })}
        </Alert>
      ) : null}
      <div className="mt-6 overflow-x-auto rounded-xl border border-navy-100 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-navy-50">
            <tr>
              <th className="px-3 py-2">Code</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Contact</th>
              <th className="px-3 py-2">Pickup</th>
              <th className="px-3 py-2">Match</th>
            </tr>
          </thead>
          <tbody>
            {data.map((b) => (
              <tr key={b.id} className="border-t border-navy-100">
                <td className="px-3 py-2 font-medium">{b.booking_code}</td>
                <td className="px-3 py-2">
                  <Badge>{t(`bookingStatus.${b.status}`, { ns: 'common' })}</Badge>
                </td>
                <td className="px-3 py-2">{formatDate(b.pickup_date)}</td>
                <td className="px-3 py-2">
                  {b.contact_name}
                  <br />
                  <span className="text-navy-500">{b.contact_phone}</span>
                </td>
                <td className="px-3 py-2 max-w-xs truncate">{b.pickup_address}</td>
                <td className="px-3 py-2">
                  <button
                    type="button"
                    className="text-brand-700 underline"
                    onClick={() => void runSuggest(b.id)}
                  >
                    Gợi ý trip
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!isLoading && data.length === 0 ? (
          <div className="p-6">
            <EmptyState title={t('status.empty', { ns: 'common' })} />
          </div>
        ) : null}
      </div>
      {suggestFor ? (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Gợi ý deterministic cho booking</CardTitle>
          </CardHeader>
          <CardContent>
            {suggestError ? <Alert variant="error">{suggestError}</Alert> : null}
            {suggestions.length === 0 && !suggestError ? (
              <p className="text-sm text-navy-600">Không có trip phù hợp (hoặc chưa có tọa độ/chuyến).</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {suggestions.map((s) => (
                  <li key={s.trip_id} className="rounded border border-navy-100 px-3 py-2">
                    Trip {s.trip_id.slice(0, 8)}… · {formatDate(s.departure_date)} · seats{' '}
                    {s.seats_available}
                    {s.distance_to_pickup_m != null
                      ? ` · ~${Math.round(s.distance_to_pickup_m / 1000)} km`
                      : ''}
                    {s.operator_verified ? ' · operator ✓' : ''}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      ) : null}
    </>
  )
}

export function AdminTripsPage() {
  const { t } = useTranslation(['pages', 'common'])
  const { data = [], isLoading } = useQuery({
    queryKey: ['admin-trips'],
    queryFn: async () => {
      const supabase = tryGetSupabase()
      if (!supabase) return []
      const { data: rows, error } = await supabase
        .from('trips')
        .select('id, departure_date, total_seats, seats_available, status, estimated_price_jpy')
        .order('departure_date', { ascending: true })
        .limit(50)
      if (error) throw error
      return rows ?? []
    },
  })

  return (
    <>
      <PageMeta title={t('admin.trips')} path="/quan-tri/chuyen" noIndex />
      <h1 className="text-2xl font-bold">{t('admin.trips')}</h1>
      <p className="mt-2 text-sm text-navy-600">
        Ghép booking chỉ hoàn tất khi dispatcher xác nhận (reserve_trip_seats).
      </p>
      {isLoading ? <Spinner className="mt-6" /> : null}
      <div className="mt-6 space-y-3">
        {data.map((trip) => (
          <Card key={trip.id}>
            <CardContent className="flex flex-wrap justify-between gap-3 py-4">
              <div>
                <p className="font-semibold">{formatDate(trip.departure_date)}</p>
                <p className="text-sm text-navy-600">
                  Ghế: {trip.seats_available}/{trip.total_seats}
                </p>
              </div>
              <Badge>{trip.status}</Badge>
            </CardContent>
          </Card>
        ))}
      </div>
      {!isLoading && data.length === 0 ? (
        <EmptyState title={t('status.empty', { ns: 'common' })} />
      ) : null}
    </>
  )
}

export function AdminDriversPage() {
  const { t } = useTranslation(['pages', 'common'])
  const { data = [], isLoading } = useQuery({
    queryKey: ['admin-drivers'],
    queryFn: async () => {
      const supabase = tryGetSupabase()
      if (!supabase) return []
      const { data: rows, error } = await supabase
        .from('drivers')
        .select('id, full_name, verification_status, is_active, phone')
        .order('full_name')
        .limit(100)
      if (error) throw error
      return rows ?? []
    },
  })

  return (
    <>
      <PageMeta title={t('admin.drivers')} path="/quan-tri/tai-xe" noIndex />
      <h1 className="text-2xl font-bold">{t('admin.drivers')}</h1>
      <Alert className="mt-4" variant="warning">
        Tài xế không tự đăng ký nhận chuyến. Trạng thái: pending / verified / suspended / rejected.
      </Alert>
      {isLoading ? <Spinner className="mt-6" /> : null}
      <ul className="mt-6 space-y-2">
        {data.map((d) => (
          <li key={d.id}>
            <Card>
              <CardContent className="flex justify-between py-3">
                <span>
                  {d.full_name} {d.phone ? `· ${d.phone}` : ''}
                </span>
                <Badge
                  variant={
                    d.verification_status === 'verified'
                      ? 'success'
                      : d.verification_status === 'rejected'
                        ? 'danger'
                        : 'warning'
                  }
                >
                  {d.verification_status}
                </Badge>
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

export function AdminVehiclesPage() {
  const { t } = useTranslation(['pages', 'common'])
  const { data = [], isLoading } = useQuery({
    queryKey: ['admin-vehicles'],
    queryFn: async () => {
      const supabase = tryGetSupabase()
      if (!supabase) return []
      const { data: rows, error } = await supabase
        .from('vehicles')
        .select('id, plate_number, seat_capacity, verification_status, is_active')
        .order('plate_number')
        .limit(100)
      if (error) throw error
      return rows ?? []
    },
  })

  return (
    <>
      <PageMeta title={t('admin.vehicles')} path="/quan-tri/phuong-tien" noIndex />
      <h1 className="text-2xl font-bold">{t('admin.vehicles')}</h1>
      {isLoading ? <Spinner className="mt-6" /> : null}
      <ul className="mt-6 space-y-2">
        {data.map((v) => (
          <li key={v.id}>
            <Card>
              <CardContent className="flex justify-between py-3">
                <span>
                  {v.plate_number} · {v.seat_capacity} seats
                </span>
                <Badge>{v.verification_status}</Badge>
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

export function AdminSupportPage() {
  const { t } = useTranslation(['pages', 'common'])
  const { data = [], isLoading } = useQuery({
    queryKey: ['admin-support'],
    queryFn: async () => {
      const supabase = tryGetSupabase()
      if (!supabase) return []
      const { data: rows, error } = await supabase
        .from('support_requests')
        .select('id, request_code, title, status, priority, contact_name, created_at')
        .order('created_at', { ascending: false })
        .limit(100)
      if (error) throw error
      return rows ?? []
    },
  })

  return (
    <>
      <PageMeta title={t('admin.support')} path="/quan-tri/ho-tro" noIndex />
      <h1 className="text-2xl font-bold">{t('admin.support')}</h1>
      {isLoading ? <Spinner className="mt-6" /> : null}
      <ul className="mt-6 space-y-2">
        {data.map((r) => (
          <li key={r.id}>
            <Card>
              <CardContent className="py-3">
                <div className="flex justify-between gap-2">
                  <strong>{r.request_code}</strong>
                  <Badge>{r.status}</Badge>
                </div>
                <p className="text-sm text-navy-700">{r.title}</p>
                <p className="text-xs text-navy-500">{r.contact_name}</p>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </>
  )
}

export function AdminContentPage() {
  const { t } = useTranslation(['pages', 'common'])
  const { data = [], isLoading } = useQuery({
    queryKey: ['admin-content'],
    queryFn: async () => {
      const supabase = tryGetSupabase()
      if (!supabase) return []
      const { data: rows, error } = await supabase
        .from('content_pages')
        .select('id, slug, title_vi, is_published, updated_at')
        .order('slug')
      if (error) throw error
      return rows ?? []
    },
  })

  return (
    <>
      <PageMeta title={t('admin.content')} path="/quan-tri/noi-dung" noIndex />
      <h1 className="text-2xl font-bold">{t('admin.content')}</h1>
      {isLoading ? <Spinner className="mt-6" /> : null}
      <ul className="mt-6 space-y-2">
        {data.map((p) => (
          <li key={p.id}>
            <Card>
              <CardContent className="flex justify-between py-3">
                <span>
                  /{p.slug} — {p.title_vi}
                </span>
                <Badge variant={p.is_published ? 'success' : 'muted'}>
                  {p.is_published ? 'published' : 'draft'}
                </Badge>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </>
  )
}

export function AdminAuditPage() {
  const { t } = useTranslation(['pages', 'common'])
  const { data = [], isLoading, isError } = useQuery({
    queryKey: ['admin-audit'],
    queryFn: async () => {
      const supabase = tryGetSupabase()
      if (!supabase) return []
      const { data: rows, error } = await supabase
        .from('audit_logs')
        .select('id, action, entity_type, entity_id, created_at, actor_id')
        .order('created_at', { ascending: false })
        .limit(100)
      if (error) throw error
      return rows ?? []
    },
  })

  return (
    <>
      <PageMeta title={t('admin.audit')} path="/quan-tri/audit" noIndex />
      <h1 className="text-2xl font-bold">{t('admin.audit')}</h1>
      <Alert className="mt-4" variant="info">
        Audit log không được xóa trực tiếp (kể cả super_admin) qua RLS.
      </Alert>
      {isLoading ? <Spinner className="mt-6" /> : null}
      {isError ? (
        <Alert variant="error" className="mt-4">
          {t('status.error', { ns: 'common' })}
        </Alert>
      ) : null}
      <div className="mt-6 space-y-2">
        {data.map((log) => (
          <Card key={log.id}>
            <CardContent className="py-3 text-sm">
              <p className="font-medium">
                {log.action} · {log.entity_type}
              </p>
              <p className="text-navy-500">{new Date(log.created_at).toLocaleString()}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  )
}

export function DriverTripsPage() {
  const { t } = useTranslation(['pages', 'common'])
  const { data = [], isLoading } = useQuery({
    queryKey: ['driver-trips'],
    queryFn: async () => {
      const supabase = tryGetSupabase()
      if (!supabase) return []
      // RLS limits to assigned trips for driver role
      const { data: rows, error } = await supabase
        .from('trips')
        .select('id, departure_date, status, seats_available, total_seats')
        .order('departure_date')
        .limit(50)
      if (error) throw error
      return rows ?? []
    },
  })

  return (
    <>
      <PageMeta title={t('driver.title')} path="/tai-xe" noIndex />
      <h1 className="text-2xl font-bold">{t('driver.title')}</h1>
      {isLoading ? <Spinner className="mt-6" /> : null}
      {!isLoading && data.length === 0 ? (
        <EmptyState title={t('driver.empty')} />
      ) : (
        <ul className="mt-6 space-y-3">
          {data.map((trip) => (
            <li key={trip.id}>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{formatDate(trip.departure_date)}</CardTitle>
                </CardHeader>
                <CardContent className="flex justify-between">
                  <span>
                    {trip.seats_available}/{trip.total_seats} seats
                  </span>
                  <Badge>{trip.status}</Badge>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
