/**
 * Locale-aware date formatting.
 *
 * When the active i18n language is Persian (fa), dates are formatted using the
 * Jalali (Shamsi) calendar via date-fns-jalali. For every other language the
 * standard Gregorian date-fns formatter is used.
 *
 * Two exports are provided:
 *   - default `format(date, formatStr, options)` — drop-in replacement for
 *     `import format from 'date-fns/format'`.
 *   - named `formatDate(date?)` — convenience helper preserving the original
 *     project util signature (safe on undefined/invalid input, MM/dd/yyyy).
 */
import gregorianFormat from 'date-fns/format'
import jalaliFormat from 'date-fns-jalali/format'
import i18n from '../config/i18n'

type FormatOptions = Parameters<typeof gregorianFormat>[2]

const isPersian = (): boolean => (i18n.language || 'en').split('-')[0] === 'fa'

export default function format(
  date: Date | number,
  formatStr: string,
  options?: FormatOptions,
): string {
  if (isPersian()) {
    return jalaliFormat(date, formatStr, options)
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
  return format(dateObject, 'MM/dd/yyyy')
}
