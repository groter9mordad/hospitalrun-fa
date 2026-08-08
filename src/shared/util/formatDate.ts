/**
 * Persian-only Jalali (Shamsi) date formatting.
 *
 * Every user-visible date is formatted with the Persian calendar and Persian
 * digits. ISO/Gregorian timestamps remain unchanged only at the data/API
 * boundary so that persisted records stay compatible with HospitalRun.
 *
 * Two exports are provided:
 *   - default `format(date, formatStr, options)` — drop-in replacement for
 *     `import format from 'date-fns/format'`.
 *   - named `formatDate(date?)` — convenience helper preserving the original
 *     project util signature (safe on undefined/invalid input, yyyy/MM/dd).
 */
import jalaliFormat from 'date-fns-jalali/format'
import faJalaliLocale from 'date-fns-jalali/locale/fa-jalali-IR'

type FormatOptions = Parameters<typeof jalaliFormat>[2]

// Map Latin (ASCII) digits to Persian digits.
const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹']

export const toPersianDigits = (input: string): string =>
  input.replace(/[0-9]/g, (d) => PERSIAN_DIGITS[Number(d)])

export default function format(
  date: Date | number,
  formatStr: string,
  options?: FormatOptions,
): string {
  const formatted = jalaliFormat(date, formatStr, {
    locale: faJalaliLocale,
    ...options,
  })
  return toPersianDigits(formatted)
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
