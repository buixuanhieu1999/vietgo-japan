import { Phone, MessageCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { env } from '@/lib/env'
import { telHref } from '@/lib/utils'

export function MobileContactBar() {
  const { t } = useTranslation()
  const phone = env.contactPhone
  const line = env.contactLineId

  if (!phone && !line) return null

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex border-t border-navy-200 bg-white shadow-lg md:hidden">
      {phone ? (
        <a
          href={telHref(phone)}
          className="flex flex-1 items-center justify-center gap-2 py-3 text-base font-semibold text-navy-900"
        >
          <Phone className="h-5 w-5 text-brand-600" />
          {t('cta.call')}
        </a>
      ) : null}
      {line ? (
        <a
          href={`https://line.me/R/ti/p/${encodeURIComponent(line)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-1 items-center justify-center gap-2 border-l border-navy-100 bg-emerald-600 py-3 text-base font-semibold text-white"
        >
          <MessageCircle className="h-5 w-5" />
          {t('cta.line')}
        </a>
      ) : null}
    </div>
  )
}
