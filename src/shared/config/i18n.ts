import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import resources from '../locales'

// Languages that require right-to-left layout
const RTL_LANGUAGES = ['fa', 'ar', 'he', 'ur']

const applyDirection = (lng: string) => {
  if (typeof document === 'undefined') {
    return
  }
  const base = (lng || 'en').split('-')[0]
  const isRtl = RTL_LANGUAGES.includes(base)
  document.documentElement.setAttribute('dir', isRtl ? 'rtl' : 'ltr')
  document.documentElement.setAttribute('lang', base)
}

i18n
  // pass the i18n instance to react-i18next.
  .use(initReactI18next)
  // init i18next
  // for all options read: https://www.i18next.com/overview/configuration-options
  .init({
    // This distribution is intentionally Persian-only. Keeping a single
    // application language also guarantees every date formatter selects the
    // Jalali calendar instead of silently falling back to Gregorian output.
    lng: 'fa',
    fallbackLng: 'fa',
    supportedLngs: ['fa'],
    debug: false,
    resources,
    interpolation: {
      escapeValue: false, // not needed for react as it escapes by default
    },
  })

// Apply direction on initial load and whenever the language changes
applyDirection('fa')
i18n.on('languageChanged', applyDirection)

export default i18n
export { resources }
