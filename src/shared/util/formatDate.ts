/**
 * Locale-aware date formatting.
 *
 * When the active i18n language is Persian (fa), dates are formatted using the
 * Jalali (Shamsi) calendar via date-fns-jalali with the Persian (fa-jalali-IR)
 * locale, and the resulting Latin digits are converted to Persian digits
 * (۰۱۲۳۴۵۶۷۸۹). For every other language the standard Gregorian date-fns
 * formatter is used.
 *
 * Two exports are provided:
 *   - default `format(date, formatStr, options)` — drop-in replacement for
 *     `import format from 'date-fns/format'`.
 *   - named `formatDate(date?)` — convenience helper preserving the original
 *     project util signature (safe on undefined/invalid input, yyyy/MM/dd).
 */
import jalaliFormat from 'date-fns-jalali/format'
import faJalaliLocale from 'date-fns-jalali/locale/fa-jalali-IR'
import gregorianFormat from 'date-fns/format'

import i18n from '../config/i18n'

type FormatOptions = Parameters<typeof gregorianFormat>[2]

const isPersian = (): boolean => (i18n.language || 'en').split('-')[0] === 'fa'

// Map Latin (ASCII) digits to Persian digits.
const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹']

export const toPersianDigits = (input: string): string =>
  input.replace(/[0-9]/g, (d) => PERSIAN_DIGITS[Number(d)])

export default function format(
  date: Date | number,
  formatStr: string,
  options?: FormatOptions,
): string {
  if (isPersian()) {
    const formatted = jalaliFormat(date, formatStr, {
      locale: faJalaliLocale,
      ...options,
    })
    return toPersianDigits(formatted)
  }
  return gregorianFormat(date, formatStr, options)
}

export const formatDate = (date?: string | Date): string => {
  if (!date) {
    return ''
  }
  const dateObject = typeof date === 'string' ? new Date(date) : date
  if (Number.isNaN(dateObject.getTime())) {
    return ''
  }
  return format(dateObject, 'yyyy/MM/dd')
}
