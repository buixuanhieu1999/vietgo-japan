import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Plane,
  Users,
  MapPinned,
  Factory,
  FileText,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react'
import { PageMeta } from '@/components/seo/PageMeta'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BookingForm } from '@/features/bookings/BookingForm'
import { useAirports } from '@/hooks/useAirports'
import { useRoutes } from '@/hooks/useRoutes'
import { useFaqs } from '@/hooks/useFaqs'
import { env } from '@/lib/env'
import { formatCurrencyJpy } from '@/lib/utils'

export function HomePage() {
  const { t, i18n } = useTranslation(['pages', 'common'])
  const { data: airports = [] } = useAirports()
  const { data: routes = [] } = useRoutes()
  const { data: faqs = [] } = useFaqs()
  const ja = i18n.language?.startsWith('ja')

  const services = [
    { to: '/dua-don-san-bay', icon: Plane, key: 'airport' as const },
    { to: '/xe-ghep', icon: Users, key: 'shared' as const },
    { to: '/di-tinh', icon: MapPinned, key: 'intercity' as const },
    { to: '/dua-don-nha-may', icon: Factory, key: 'factory' as const },
    { to: '/ho-tro-ho-so', icon: FileText, key: 'support' as const },
  ]

  return (
    <>
      <PageMeta
        title={t('home.title')}
        description={t('home.meta')}
        path="/"
      />

      <section className="bg-navy-900 text-white">
        <div className="container-app grid items-center gap-10 py-14 lg:grid-cols-2 lg:py-20">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-brand-300">
              {t('appName', { ns: 'common' })} · Nagoya
            </p>
            <h1 className="mt-3 text-3xl font-bold leading-tight text-white text-balance sm:text-4xl lg:text-5xl">
              {t('home.heroTitle')}
            </h1>
            <p className="mt-4 text-lg text-navy-100 text-balance">{t('home.heroSubtitle')}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/dat-xe"
                className="inline-flex h-12 items-center rounded-lg bg-brand-600 px-6 text-base font-semibold text-white hover:bg-brand-700"
              >
                {t('cta.bookNow', { ns: 'common' })}
              </Link>
              <Link
                to="/phap-ly/chong-van-tai-trai-phep"
                className="inline-flex h-12 items-center rounded-lg border border-navy-500 px-6 text-base font-medium text-white hover:bg-navy-800"
              >
                {t('safety.title', { ns: 'common' })}
              </Link>
            </div>
            <ul className="mt-8 space-y-2 text-sm text-navy-100">
              <li className="flex gap-2">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-brand-300" />
                {t('safety.verifiedOnly', { ns: 'common' })}
              </li>
              <li className="flex gap-2">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-brand-300" />
                {t('safety.noWhitePlate', { ns: 'common' })}
              </li>
            </ul>
          </div>
          <Card className="border-0 shadow-xl">
            <CardHeader>
              <CardTitle>{t('home.quickBook')}</CardTitle>
            </CardHeader>
            <CardContent>
              <BookingForm compact />
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="container-app py-14">
        <h2 className="text-2xl font-bold sm:text-3xl">{t('home.servicesTitle')}</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map(({ to, icon: Icon, key }) => (
            <Link
              key={to}
              to={to}
              className="group rounded-xl border border-navy-100 bg-white p-5 shadow-sm transition hover:border-brand-200 hover:shadow-md"
            >
              <Icon className="h-8 w-8 text-brand-600" aria-hidden />
              <h3 className="mt-3 text-lg font-semibold text-navy-900 group-hover:text-brand-700">
                {t(`nav.${key}`, { ns: 'common' })}
              </h3>
              <p className="mt-2 text-sm text-navy-600 line-clamp-3">
                {t(`${key === 'shared' ? 'shared' : key}.intro`)}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section className="bg-white py-14">
        <div className="container-app">
          <h2 className="text-2xl font-bold sm:text-3xl">{t('home.airportsTitle')}</h2>
          <div className="mt-6 flex flex-wrap gap-3">
            {airports.map((a) => (
              <span
                key={a.id}
                className="rounded-full border border-navy-200 bg-navy-50 px-4 py-2 text-sm font-medium text-navy-800"
              >
                <strong className="text-navy-900">{a.iata_code}</strong>
                {' — '}
                {ja ? a.name_ja : a.name_vi}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="container-app py-14">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-2xl font-bold sm:text-3xl">{t('home.routesTitle')}</h2>
          <Link to="/tuyen-duong" className="text-sm font-medium text-brand-700 hover:underline">
            {t('cta.viewAll', { ns: 'common' })}
          </Link>
        </div>
        {routes.length === 0 ? (
          <p className="mt-6 text-navy-600">{t('status.empty', { ns: 'common' })}</p>
        ) : (
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {routes.slice(0, 4).map((r) => (
              <Card key={r.id}>
                <CardContent className="py-5">
                  <h3 className="font-semibold text-navy-900">
                    {ja && r.name_ja ? r.name_ja : r.name_vi}
                  </h3>
                  <p className="mt-1 text-sm text-navy-600">
                    {r.origin_label} → {r.destination_label}
                  </p>
                  <p className="mt-2 text-sm text-navy-500">
                    {r.base_price_jpy != null
                      ? formatCurrencyJpy(r.base_price_jpy, ja ? 'ja-JP' : 'vi-VN')
                      : t('pricing.noPrice')}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="bg-navy-50 py-14">
        <div className="container-app">
          <h2 className="text-2xl font-bold sm:text-3xl">{t('home.processTitle')}</h2>
          <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((n) => (
              <li key={n} className="rounded-xl bg-white p-5 shadow-sm">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-navy-900 text-sm font-bold text-white">
                  {n}
                </span>
                <p className="mt-3 font-medium text-navy-900">
                  {t(`home.process${n}` as 'home.process1')}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="container-app py-14">
        <h2 className="text-2xl font-bold sm:text-3xl">{t('safety.title', { ns: 'common' })}</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            t('safety.verifiedOnly', { ns: 'common' }),
            t('safety.noWhitePlate', { ns: 'common' }),
            t('safety.noFakeLicense', { ns: 'common' }),
          ].map((text) => (
            <div key={text} className="flex gap-3 rounded-xl border border-navy-100 bg-white p-5">
              <CheckCircle2 className="h-6 w-6 shrink-0 text-brand-600" />
              <p className="text-navy-800">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white py-14">
        <div className="container-app">
          <h2 className="text-2xl font-bold sm:text-3xl">{t('home.reviewsTitle')}</h2>
          <p className="mt-4 max-w-2xl text-navy-600">{t('home.reviewsEmpty')}</p>
        </div>
      </section>

      <section className="container-app py-14">
        <h2 className="text-2xl font-bold sm:text-3xl">{t('home.faqTitle')}</h2>
        <div className="mt-6 space-y-3">
          {faqs.slice(0, 5).map((f) => (
            <details key={f.id} className="rounded-xl border border-navy-100 bg-white p-4">
              <summary className="cursor-pointer font-medium text-navy-900">
                {ja && f.question_ja ? f.question_ja : f.question_vi}
              </summary>
              <p className="mt-3 text-navy-700 whitespace-pre-wrap">
                {ja && f.answer_ja ? f.answer_ja : f.answer_vi}
              </p>
            </details>
          ))}
          {faqs.length === 0 ? (
            <p className="text-navy-600">{t('status.empty', { ns: 'common' })}</p>
          ) : null}
          <Link to="/faq" className="inline-block text-sm font-medium text-brand-700 hover:underline">
            {t('cta.viewAll', { ns: 'common' })}
          </Link>
        </div>
      </section>

      <section className="bg-navy-50 py-14">
        <div className="container-app grid gap-8 lg:grid-cols-2">
          <div>
            <h2 className="text-2xl font-bold sm:text-3xl">{t('home.officeTitle')}</h2>
            <p className="mt-3 text-navy-700">{t('office.city')}</p>
            <p className="mt-2 text-navy-600">
              {env.contactAddress || t('office.addressPlaceholder')}
            </p>
            <p className="text-navy-600">{env.contactPhone || '[Phone — admin update]'}</p>
            <p className="text-navy-600">{env.contactEmail || '[Email — admin update]'}</p>
            <Link to="/tru-so-nagoya" className="mt-4 inline-block text-brand-700 hover:underline">
              {t('cta.learnMore', { ns: 'common' })}
            </Link>
          </div>
          <div className="rounded-2xl bg-navy-900 p-8 text-white">
            <h2 className="text-2xl font-bold">{t('home.ctaTitle')}</h2>
            <p className="mt-3 text-navy-100">{t('home.ctaBody')}</p>
            <Button
              type="button"
              className="mt-6"
              size="lg"
              onClick={() => {
                window.location.href = '/dat-xe'
              }}
            >
              {t('cta.bookNow', { ns: 'common' })}
            </Button>
          </div>
        </div>
      </section>
    </>
  )
}
