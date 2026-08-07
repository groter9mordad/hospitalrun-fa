/**
 * Locale-aware date formatting.
 *
 * When the active i18n language is Persian (fa), dates are formatted using the
 * Jalali (Shamsi) calendar via date-fns-jalali. For every other language the
 * standard Gregorian date-fns formatter is used.
 *
 * The public signature is identical to `date-fns/format`, so this module is a
 * drop-in replacement for `import format from './formatDate'`.
 */
import gregorianFormat from 'date-fns/format'
import jalaliFormat from 'date-fns-jalali/format'
import i18n from '../config/i18n'

type FormatOptions = Parameters<typeof gregorianFormat>[2]

export default function format(
  date: Date | number,
  formatStr: string,
  options?: FormatOptions,
): string {
  const lng = (i18n.language || 'en').split('-')[0]
  if (lng === 'fa') {
    return jalaliFormat(date, formatStr, options)
  }
  return gregorianFormat(date, formatStr, options)
}
