import { NavLink, Outlet, Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/providers/AuthProvider'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'
import { SiteHeader } from '@/components/layout/SiteHeader'

export function CustomerLayout() {
  const { t } = useTranslation()
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }
  if (!user) return <Navigate to="/dang-nhap" replace />

  const links = [
    { to: '/tai-khoan', end: true, label: t('customer.title', { ns: 'pages' }) },
    { to: '/tai-khoan/booking', label: t('customer.bookings', { ns: 'pages' }) },
    { to: '/tai-khoan/ho-tro', label: t('customer.tickets', { ns: 'pages' }) },
    { to: '/tai-khoan/thong-bao', label: t('customer.notifications', { ns: 'pages' }) },
    { to: '/tai-khoan/ho-so', label: t('customer.profile', { ns: 'pages' }) },
  ]

  return (
    <div className="min-h-screen bg-navy-50">
      <SiteHeader />
      <div className="container-app grid gap-6 py-8 lg:grid-cols-[220px_1fr]">
        <aside className="h-fit rounded-xl border border-navy-100 bg-white p-3 shadow-sm">
          <nav className="flex flex-col gap-1">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                className={({ isActive }) =>
                  cn(
                    'rounded-lg px-3 py-2.5 text-sm font-medium',
                    isActive ? 'bg-navy-900 text-white' : 'text-navy-700 hover:bg-navy-50',
                  )
                }
              >
                {l.label}
              </NavLink>
            ))}
          </nav>
        </aside>
        <div>
          <Outlet />
        </div>
      </div>
    </div>
  )
}

export function AdminLayout() {
  const { t } = useTranslation()
  const { user, loading, isAdmin, isStaff } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }
  if (!user) return <Navigate to="/dang-nhap" replace />
  if (!isAdmin && !isStaff) return <Navigate to="/tai-khoan" replace />

  const links = [
    { to: '/quan-tri', end: true, label: t('admin.overview', { ns: 'pages' }) },
    { to: '/quan-tri/booking', label: t('admin.bookings', { ns: 'pages' }) },
    { to: '/quan-tri/chuyen', label: t('admin.trips', { ns: 'pages' }) },
    { to: '/quan-tri/tai-xe', label: t('admin.drivers', { ns: 'pages' }) },
    { to: '/quan-tri/phuong-tien', label: t('admin.vehicles', { ns: 'pages' }) },
    { to: '/quan-tri/ho-tro', label: t('admin.support', { ns: 'pages' }) },
    { to: '/quan-tri/noi-dung', label: t('admin.content', { ns: 'pages' }) },
    { to: '/quan-tri/audit', label: t('admin.audit', { ns: 'pages' }) },
  ]

  return (
    <div className="min-h-screen bg-navy-50">
      <SiteHeader />
      <div className="container-app grid gap-6 py-8 lg:grid-cols-[220px_1fr]">
        <aside className="h-fit rounded-xl border border-navy-100 bg-white p-3 shadow-sm">
          <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-navy-500">
            {t('admin.title', { ns: 'pages' })}
          </p>
          <nav className="flex flex-col gap-1">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                className={({ isActive }) =>
                  cn(
                    'rounded-lg px-3 py-2.5 text-sm font-medium',
                    isActive ? 'bg-brand-600 text-white' : 'text-navy-700 hover:bg-navy-50',
                  )
                }
              >
                {l.label}
              </NavLink>
            ))}
          </nav>
        </aside>
        <div>
          <Outlet />
        </div>
      </div>
    </div>
  )
}

export function DriverLayout() {
  const { user, loading, isDriver, isAdmin } = useAuth()
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }
  if (!user) return <Navigate to="/dang-nhap" replace />
  if (!isDriver && !isAdmin) return <Navigate to="/tai-khoan" replace />
  return (
    <div className="min-h-screen bg-navy-50">
      <SiteHeader />
      <div className="container-app py-8">
        <Outlet />
      </div>
    </div>
  )
}
