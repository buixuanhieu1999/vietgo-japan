import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Menu, X, Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/providers/AuthProvider'
import { cn } from '@/lib/utils'

export function SiteHeader() {
  const { t, i18n } = useTranslation()
  const { user, isAdmin, isStaff, signOut } = useAuth()
  const [open, setOpen] = useState(false)

  const links = [
    { to: '/dua-don-san-bay', label: t('nav.airport') },
    { to: '/xe-ghep', label: t('nav.shared') },
    { to: '/di-tinh', label: t('nav.intercity') },
    { to: '/dua-don-nha-may', label: t('nav.factory') },
    { to: '/ho-tro-ho-so', label: t('nav.support') },
    { to: '/bang-gia', label: t('nav.pricing') },
    { to: '/lien-he', label: t('nav.contact') },
  ]

  const toggleLang = () => {
    void i18n.changeLanguage(i18n.language?.startsWith('ja') ? 'vi' : 'ja')
  }

  return (
    <header className="sticky top-0 z-40 border-b border-navy-100 bg-white/95 backdrop-blur">
      <div className="container-app flex h-16 items-center justify-between gap-3">
        <Link to="/" className="flex items-center gap-2 font-semibold text-navy-900">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy-900 text-sm text-white">
            VG
          </span>
          <span className="hidden sm:inline">{t('appName')}</span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                cn(
                  'rounded-md px-2.5 py-2 text-sm font-medium',
                  isActive ? 'bg-navy-50 text-navy-900' : 'text-navy-600 hover:bg-navy-50',
                )
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={toggleLang}
            aria-label={t('lang.label')}
            className="gap-1"
          >
            <Globe className="h-4 w-4" />
            {i18n.language?.startsWith('ja') ? 'JA' : 'VI'}
          </Button>
          <Link
            to="/dat-xe"
            className="hidden h-9 items-center rounded-lg bg-navy-900 px-3 text-sm font-medium text-white hover:bg-navy-800 sm:inline-flex"
          >
            {t('nav.book')}
          </Link>
          {user ? (
            <>
              <Link
                to="/tai-khoan"
                className="hidden h-9 items-center rounded-lg border-2 border-navy-900 px-3 text-sm font-medium text-navy-900 md:inline-flex"
              >
                {t('nav.dashboard')}
              </Link>
              {(isAdmin || isStaff) && (
                <Link
                  to="/quan-tri"
                  className="hidden h-9 items-center px-2 text-sm font-medium text-navy-700 md:inline-flex"
                >
                  {t('nav.admin')}
                </Link>
              )}
              <Button type="button" variant="ghost" size="sm" onClick={() => void signOut()}>
                {t('nav.logout')}
              </Button>
            </>
          ) : (
            <Link
              to="/dang-nhap"
              className="hidden h-9 items-center rounded-lg border-2 border-navy-900 px-3 text-sm font-medium text-navy-900 sm:inline-flex"
            >
              {t('nav.login')}
            </Link>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? t('nav.close') : t('nav.menu')}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {open ? (
        <div className="border-t border-navy-100 bg-white lg:hidden">
          <nav className="container-app flex flex-col gap-1 py-3" aria-label="Mobile">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="rounded-lg px-3 py-3 text-base font-medium text-navy-800 hover:bg-navy-50"
                onClick={() => setOpen(false)}
              >
                {l.label}
              </Link>
            ))}
            <Link
              to="/dat-xe"
              className="rounded-lg bg-brand-600 px-3 py-3 text-center font-medium text-white"
              onClick={() => setOpen(false)}
            >
              {t('nav.book')}
            </Link>
            <Link
              to="/tra-cuu-booking"
              className="rounded-lg px-3 py-3 text-navy-700"
              onClick={() => setOpen(false)}
            >
              {t('nav.lookup')}
            </Link>
            {!user ? (
              <Link to="/dang-nhap" className="rounded-lg px-3 py-3" onClick={() => setOpen(false)}>
                {t('nav.login')}
              </Link>
            ) : (
              <Link to="/tai-khoan" className="rounded-lg px-3 py-3" onClick={() => setOpen(false)}>
                {t('nav.dashboard')}
              </Link>
            )}
          </nav>
        </div>
      ) : null}
    </header>
  )
}
