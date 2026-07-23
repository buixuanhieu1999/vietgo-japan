import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import viCommon from '@/locales/vi/common.json'
import viPages from '@/locales/vi/pages.json'
import viForms from '@/locales/vi/forms.json'
import jaCommon from '@/locales/ja/common.json'
import jaPages from '@/locales/ja/pages.json'
import jaForms from '@/locales/ja/forms.json'

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      vi: { common: viCommon, pages: viPages, forms: viForms },
      ja: { common: jaCommon, pages: jaPages, forms: jaForms },
      // English ready for future: add locales/en/* and enable here
    },
    fallbackLng: 'vi',
    defaultNS: 'common',
    ns: ['common', 'pages', 'forms'],
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },
  })

export default i18n
