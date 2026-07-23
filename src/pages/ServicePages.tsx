import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { PageMeta } from '@/components/seo/PageMeta'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BookingForm } from '@/features/bookings/BookingForm'
import { useRoutes } from '@/hooks/useRoutes'
import { useAirports } from '@/hooks/useAirports'
import { Alert } from '@/components/ui/alert'
import { formatCurrencyJpy } from '@/lib/utils'
import type { ServiceType } from '@/types/database'

function ServiceShell({
  titleKey,
  metaKey,
  introKey,
  serviceType,
  path,
  children,
}: {
  titleKey: string
  metaKey: string
  introKey: string
  serviceType?: ServiceType
  path: string
  children?: React.ReactNode
}) {
  const { t } = useTranslation('pages')
  return (
    <>
      <PageMeta title={t(titleKey)} description={t(metaKey)} path={path} />
      <div className="container-app py-10">
        <h1 className="text-3xl font-bold text-navy-900">{t(titleKey)}</h1>
        <p className="mt-4 max-w-3xl text-lg text-navy-700">{t(introKey)}</p>
        {children}
        <div className="mt-10 grid gap-8 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{t('book.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <BookingForm defaultServiceType={serviceType} />
            </CardContent>
          </Card>
          <div className="space-y-4">
            <Alert variant="info">{t('safety.verifiedOnly', { ns: 'common' })}</Alert>
            <Link
              to="/dat-xe"
              className="inline-flex h-11 items-center rounded-lg bg-brand-600 px-5 font-medium text-white hover:bg-brand-700"
            >
              {t('cta.bookNow', { ns: 'common' })}
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}

export function AirportPage() {
  const { data: airports = [] } = useAirports()
  const { i18n } = useTranslation()
  const ja = i18n.language?.startsWith('ja')
  return (
    <ServiceShell
      titleKey="airport.title"
      metaKey="airport.meta"
      introKey="airport.intro"
      serviceType="airport_transfer"
      path="/dua-don-san-bay"
    >
      <ul className="mt-6 flex flex-wrap gap-2">
        {airports.map((a) => (
          <li
            key={a.id}
            className="rounded-full bg-navy-100 px-3 py-1 text-sm font-medium text-navy-800"
          >
            {a.iata_code} · {ja ? a.name_ja : a.name_vi}
          </li>
        ))}
      </ul>
    </ServiceShell>
  )
}

export function SharedRidePage() {
  return (
    <ServiceShell
      titleKey="shared.title"
      metaKey="shared.meta"
      introKey="shared.intro"
      serviceType="shared_ride"
      path="/xe-ghep"
    />
  )
}

export function IntercityPage() {
  return (
    <ServiceShell
      titleKey="intercity.title"
      metaKey="intercity.meta"
      introKey="intercity.intro"
      serviceType="intercity"
      path="/di-tinh"
    />
  )
}

export function FactoryPage() {
  return (
    <ServiceShell
      titleKey="factory.title"
      metaKey="factory.meta"
      introKey="factory.intro"
      serviceType="factory_shuttle"
      path="/dua-don-nha-may"
    />
  )
}

export function PricingPage() {
  const { t, i18n } = useTranslation(['pages', 'common'])
  const { data: routes = [] } = useRoutes()
  const ja = i18n.language?.startsWith('ja')
  return (
    <>
      <PageMeta title={t('pricing.title')} description={t('pricing.meta')} path="/bang-gia" />
      <div className="container-app py-10">
        <h1 className="text-3xl font-bold">{t('pricing.title')}</h1>
        <p className="mt-4 max-w-3xl text-navy-700">{t('pricing.intro')}</p>
        <Alert variant="warning" className="mt-6">
          {t('pricing.note')}
        </Alert>
        <div className="mt-8 overflow-x-auto rounded-xl border border-navy-100 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-navy-50 text-navy-700">
              <tr>
                <th className="px-4 py-3 font-semibold">Route</th>
                <th className="px-4 py-3 font-semibold">{t('pricing.noPrice')}</th>
              </tr>
            </thead>
            <tbody>
              {routes.map((r) => (
                <tr key={r.id} className="border-t border-navy-100">
                  <td className="px-4 py-3">{ja && r.name_ja ? r.name_ja : r.name_vi}</td>
                  <td className="px-4 py-3">
                    {r.base_price_jpy != null
                      ? formatCurrencyJpy(r.base_price_jpy, ja ? 'ja-JP' : 'vi-VN')
                      : t('pricing.noPrice')}
                  </td>
                </tr>
              ))}
              {routes.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-navy-600" colSpan={2}>
                    {t('status.empty', { ns: 'common' })}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}

export function RoutesPage() {
  const { t, i18n } = useTranslation(['pages', 'common'])
  const { data: routes = [], isLoading, isError } = useRoutes()
  const ja = i18n.language?.startsWith('ja')
  return (
    <>
      <PageMeta title={t('routes.title')} description={t('routes.meta')} path="/tuyen-duong" />
      <div className="container-app py-10">
        <h1 className="text-3xl font-bold">{t('routes.title')}</h1>
        <p className="mt-4 max-w-3xl text-navy-700">{t('routes.intro')}</p>
        {isLoading ? <p className="mt-6">{t('status.loading', { ns: 'common' })}</p> : null}
        {isError ? (
          <Alert variant="error" className="mt-6">
            {t('status.error', { ns: 'common' })}
          </Alert>
        ) : null}
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {routes.map((r) => (
            <Card key={r.id}>
              <CardContent className="py-5">
                <h2 className="text-lg font-semibold">
                  {ja && r.name_ja ? r.name_ja : r.name_vi}
                </h2>
                <p className="mt-1 text-sm text-navy-600">
                  {r.origin_label} → {r.destination_label}
                </p>
                {r.description_vi ? (
                  <p className="mt-2 text-sm text-navy-700">
                    {ja && r.description_ja ? r.description_ja : r.description_vi}
                  </p>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </>
  )
}
