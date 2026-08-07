import { DateTimePicker } from '@hospitalrun/components'
import React from 'react'
import DatePicker from 'react-multi-date-picker'
import persian from 'react-date-object/calendars/persian'
import persian_fa from 'react-date-object/locales/persian_fa'
import TimePicker from 'react-multi-date-picker/plugins/time_picker'

import i18n from '../../config/i18n'

/**
 * A locale-aware date/time picker.
 *
 * When the active language is Persian (fa), it renders a Jalali (Shamsi)
 * calendar using react-multi-date-picker with Persian digits and RTL layout.
 * For every other language it falls back to the original @hospitalrun/components
 * DateTimePicker (Gregorian) so behaviour is unchanged for non-Persian users.
 */
interface Props {
  id?: string
  value: Date | undefined
  onChange?: (date: Date) => void
  isEditable?: boolean
  isInvalid?: boolean
  feedback?: string
  maxDate?: Date
  withTime?: boolean
}

const isPersian = (): boolean => (i18n.language || 'en').split('-')[0] === 'fa'

const LocaleAwareDatePicker: React.FC<Props> = (props) => {
  const { id, value, onChange, isEditable, isInvalid, feedback, maxDate, withTime } = props

  if (isPersian()) {
    return (
      <div className="hr-jalali-datepicker">
        <DatePicker
          calendar={persian}
          locale={persian_fa}
          calendarPosition="bottom-right"
          value={value}
          disabled={!isEditable}
          maxDate={maxDate}
          format={withTime ? 'YYYY/MM/DD HH:mm' : 'YYYY/MM/DD'}
          plugins={withTime ? [<TimePicker key="tp" position="bottom" />] : []}
          inputClass={`form-control${isInvalid ? ' is-invalid' : ''}`}
          containerStyle={{ width: '100%' }}
          onChange={(dateObject: any) => {
            if (onChange && dateObject) {
              const jsDate =
                typeof dateObject.toDate === 'function' ? dateObject.toDate() : dateObject
              onChange(jsDate)
            }
          }}
        />
        {isInvalid && feedback ? <div className="invalid-feedback d-block">{feedback}</div> : null}
      </div>
    )
  }

  return (
    <DateTimePicker
      dateFormat={withTime ? 'MM/dd/yyyy h:mm aa' : 'MM/dd/yyyy'}
      dateFormatCalendar="LLLL yyyy"
      dropdownMode="scroll"
      maxDate={maxDate}
      selected={value}
      disabled={!isEditable}
      feedback={feedback}
      isInvalid={isInvalid}
      showYearDropdown={!withTime}
      showTimeSelect={withTime}
      timeCaption="time"
      timeFormat="h:mm aa"
      timeIntervals={withTime ? 15 : 30}
      withPortal={false}
      onChange={(inputDate: Date) => {
        if (onChange) {
          onChange(inputDate)
        }
      }}
    />
  )
}

export default LocaleAwareDatePicker
