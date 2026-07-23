import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { env } from '@/lib/env'

export function SiteFooter() {
  const { t } = useTranslation()
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-navy-200 bg-navy-900 text-navy-100">
      <div className="container-app grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-lg font-semibold text-white">{t('appName')}</p>
          <p className="mt-2 text-sm text-navy-200">{t('slogan')}</p>
          <p className="mt-4 text-sm text-navy-300">{t('footer.scope')}</p>
        </div>
        <div>
          <p className="font-semibold text-white">{t('footer.services')}</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link to="/dua-don-san-bay" className="hover:text-white">
                {t('nav.airport')}
              </Link>
            </li>
            <li>
              <Link to="/xe-ghep" className="hover:text-white">
                {t('nav.shared')}
              </Link>
            </li>
            <li>
              <Link to="/dua-don-nha-may" className="hover:text-white">
                {t('nav.factory')}
              </Link>
            </li>
            <li>
              <Link to="/ho-tro-ho-so" className="hover:text-white">
                {t('nav.support')}
              </Link>
            </li>
            <li>
              <Link to="/dat-xe" className="hover:text-white">
                {t('nav.book')}
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="font-semibold text-white">{t('footer.legal')}</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link to="/phap-ly/dieu-khoan" className="hover:text-white">
                {t('legal.terms', { ns: 'pages' })}
              </Link>
            </li>
            <li>
              <Link to="/phap-ly/quyen-rieng-tu" className="hover:text-white">
                {t('legal.privacy', { ns: 'pages' })}
              </Link>
            </li>
            <li>
              <Link to="/phap-ly/huy-chuyen" className="hover:text-white">
                {t('legal.cancellation', { ns: 'pages' })}
              </Link>
            </li>
            <li>
              <Link to="/phap-ly/chong-van-tai-trai-phep" className="hover:text-white">
                {t('legal.antiIllegal', { ns: 'pages' })}
              </Link>
            </li>
            <li>
              <Link to="/phap-ly" className="hover:text-white">
                {t('nav.legal')}
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="font-semibold text-white">{t('footer.hq')}</p>
          <p className="mt-3 text-sm">{t('footer.hqCity')}</p>
          <p className="mt-2 text-sm text-navy-300">
            {env.contactAddress || '[Địa chỉ Nagoya — cập nhật bởi quản trị viên]'}
          </p>
          <p className="mt-2 text-sm text-navy-300">
            {env.contactPhone || '[Số điện thoại — cập nhật]'}
          </p>
          <p className="text-sm text-navy-300">{env.contactEmail || '[Email — cập nhật]'}</p>
          <p className="mt-4 text-xs text-navy-400">{t('footer.placeholderNote')}</p>
        </div>
      </div>
      <div className="border-t border-navy-800 py-4 text-center text-xs text-navy-400">
        © {year} {t('appName')}. {t('footer.rights')}
      </div>
    </footer>
  )
}
