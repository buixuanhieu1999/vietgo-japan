import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { PageMeta } from '@/components/seo/PageMeta'
import { useFaqs } from '@/hooks/useFaqs'
import { tryGetSupabase } from '@/lib/supabase'
import { env } from '@/lib/env'
import { Alert } from '@/components/ui/alert'
import type { ContentPage } from '@/types/database'
import { Spinner } from '@/components/ui/spinner'
import { MapPreview } from '@/components/map/MapPreview'
import { FaqAssistant } from '@/features/ai/FaqAssistant'

export function AboutPage() {
  const { t } = useTranslation('pages')
  return (
    <>
      <PageMeta title={t('about.title')} description={t('about.meta')} path="/ve-chung-toi" />
      <div className="container-app prose-none py-10">
        <h1 className="text-3xl font-bold">{t('about.title')}</h1>
        <p className="mt-4 max-w-3xl text-lg text-navy-700">{t('about.body')}</p>
        <Alert className="mt-6 max-w-3xl" variant="info">
          {t('safety.noFakeLicense', { ns: 'common' })}
        </Alert>
      </div>
    </>
  )
}

export function OfficePage() {
  const { t } = useTranslation('pages')
  return (
    <>
      <PageMeta title={t('office.title')} description={t('office.meta')} path="/tru-so-nagoya" />
      <div className="container-app py-10">
        <h1 className="text-3xl font-bold">{t('office.title')}</h1>
        <p className="mt-4 text-lg text-navy-800">{t('office.city')}</p>
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <dl className="max-w-xl space-y-3 text-navy-700">
            <div>
              <dt className="font-semibold">Address</dt>
              <dd>{env.contactAddress || t('office.addressPlaceholder')}</dd>
            </div>
            <div>
              <dt className="font-semibold">Phone</dt>
              <dd>{env.contactPhone || '[Phone — admin update]'}</dd>
            </div>
            <div>
              <dt className="font-semibold">Email</dt>
              <dd>{env.contactEmail || '[Email — admin update]'}</dd>
            </div>
            <div>
              <dt className="font-semibold">Hours</dt>
              <dd>{t('office.hoursPlaceholder')}</dd>
            </div>
          </dl>
          <div>
            <MapPreview className="h-64" />
            <p className="mt-2 text-xs text-navy-500">
              Bản đồ MapLibre + OpenFreeMap (miễn phí pilot). Điều hướng thực tế: mở Google Maps URL.
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

export function FaqPage() {
  const { t, i18n } = useTranslation(['pages', 'common'])
  const { data: faqs = [], isLoading } = useFaqs()
  const ja = i18n.language?.startsWith('ja')
  return (
    <>
      <PageMeta title={t('faq.title')} description={t('faq.meta')} path="/faq" />
      <div className="container-app py-10">
        <h1 className="text-3xl font-bold">{t('faq.title')}</h1>
        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          <div className="space-y-3">
            {isLoading ? <Spinner className="mt-6" /> : null}
            {faqs.map((f) => (
              <details key={f.id} className="rounded-xl border border-navy-100 bg-white p-4">
                <summary className="cursor-pointer font-medium">
                  {ja && f.question_ja ? f.question_ja : f.question_vi}
                </summary>
                <p className="mt-3 whitespace-pre-wrap text-navy-700">
                  {ja && f.answer_ja ? f.answer_ja : f.answer_vi}
                </p>
              </details>
            ))}
            {!isLoading && faqs.length === 0 ? (
              <p>{t('status.empty', { ns: 'common' })}</p>
            ) : null}
          </div>
          <FaqAssistant />
        </div>
      </div>
    </>
  )
}

const LEGAL_SLUGS: Record<string, string> = {
  'dieu-khoan': 'terms',
  'quyen-rieng-tu': 'privacy',
  'huy-chuyen': 'cancellation',
  'hoan-tien': 'refund',
  'hanh-ly': 'baggage',
  'bao-ve-tre-em': 'child-protection',
  'thong-bao-phap-ly': 'legal-notice',
  'khieu-nai': 'complaints',
  'chong-van-tai-trai-phep': 'anti-illegal-transport',
}

export function LegalIndexPage() {
  const { t } = useTranslation('pages')
  const items = [
    ['dieu-khoan', 'legal.terms'],
    ['quyen-rieng-tu', 'legal.privacy'],
    ['huy-chuyen', 'legal.cancellation'],
    ['hoan-tien', 'legal.refund'],
    ['hanh-ly', 'legal.baggage'],
    ['bao-ve-tre-em', 'legal.child'],
    ['thong-bao-phap-ly', 'legal.notice'],
    ['khieu-nai', 'legal.complaints'],
    ['chong-van-tai-trai-phep', 'legal.antiIllegal'],
  ] as const

  return (
    <>
      <PageMeta title={t('nav.legal', { ns: 'common' })} path="/phap-ly" />
      <div className="container-app py-10">
        <h1 className="text-3xl font-bold">{t('nav.legal', { ns: 'common' })}</h1>
        <ul className="mt-8 max-w-xl space-y-3">
          {items.map(([slug, key]) => (
            <li key={slug}>
              <Link
                to={`/phap-ly/${slug}`}
                className="text-lg font-medium text-brand-700 hover:underline"
              >
                {t(key)}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </>
  )
}

export function LegalPage({ slug }: { slug: string }) {
  const { t, i18n } = useTranslation(['pages', 'common'])
  const dbSlug = LEGAL_SLUGS[slug]
  const ja = i18n.language?.startsWith('ja')

  const { data, isLoading, isError } = useQuery({
    queryKey: ['content', dbSlug],
    enabled: Boolean(dbSlug),
    queryFn: async () => {
      const supabase = tryGetSupabase()
      if (!supabase || !dbSlug) return null
      const { data: row, error } = await supabase
        .from('content_pages')
        .select('*')
        .eq('slug', dbSlug)
        .eq('is_published', true)
        .maybeSingle()
      if (error) throw error
      return row as ContentPage | null
    },
  })

  const fallbackTitle = t('nav.legal', { ns: 'common' })

  return (
    <>
      <PageMeta
        title={data ? (ja && data.title_ja ? data.title_ja : data.title_vi) : fallbackTitle}
        description={data?.meta_description_vi ?? undefined}
        path={`/phap-ly/${slug}`}
      />
      <div className="container-app py-10">
        {isLoading ? <Spinner /> : null}
        {isError ? <Alert variant="error">{t('status.error', { ns: 'common' })}</Alert> : null}
        {!isLoading && !data ? (
          <div>
            <h1 className="text-3xl font-bold">{fallbackTitle}</h1>
            <p className="mt-4 text-navy-700">
              Nội dung sẽ hiển thị sau khi seed / CMS được nạp. Xem{' '}
              <Link to="/phap-ly" className="text-brand-700 underline">
                danh sách trang pháp lý
              </Link>
              .
            </p>
            <Alert className="mt-6" variant="warning">
              Placeholder pháp lý — cần rà soát trước khi kinh doanh. Không bịa giấy phép.
            </Alert>
          </div>
        ) : null}
        {data ? (
          <article className="max-w-3xl">
            <h1 className="text-3xl font-bold">
              {ja && data.title_ja ? data.title_ja : data.title_vi}
            </h1>
            <div className="prose prose-navy mt-6 whitespace-pre-wrap text-navy-800">
              {ja && data.body_ja ? data.body_ja : data.body_vi}
            </div>
          </article>
        ) : null}
      </div>
    </>
  )
}

export function NotFoundPage() {
  const { t } = useTranslation('pages')
  return (
    <>
      <PageMeta title={t('notFound.title')} path="/404" noIndex />
      <div className="container-app py-20 text-center">
        <h1 className="text-3xl font-bold">{t('notFound.title')}</h1>
        <p className="mt-4 text-navy-600">{t('notFound.body')}</p>
        <Link
          to="/"
          className="mt-8 inline-flex h-11 items-center rounded-lg bg-navy-900 px-5 text-white"
        >
          {t('nav.home', { ns: 'common' })}
        </Link>
      </div>
    </>
  )
}
