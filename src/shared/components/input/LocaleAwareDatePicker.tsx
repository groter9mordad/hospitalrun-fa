import React from 'react'
import persian from 'react-date-object/calendars/persian'
import persianFa from 'react-date-object/locales/persian_fa'
import DatePicker, { DateObject } from 'react-multi-date-picker'
import TimePicker from 'react-multi-date-picker/plugins/time_picker'

/**
 * Persian-only Jalali (Shamsi) date/time picker.
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

const LocaleAwareDatePicker: React.FC<Props> = (props) => {
  const { id, value, onChange, isEditable, isInvalid, feedback, maxDate, withTime } = props

  return (
    <div className="hr-jalali-datepicker">
      <DatePicker
        id={id}
        calendar={persian}
        locale={persianFa}
        calendarPosition="bottom-right"
        value={value}
        disabled={!isEditable}
        maxDate={maxDate}
        format={withTime ? 'YYYY/MM/DD HH:mm' : 'YYYY/MM/DD'}
        plugins={withTime ? [<TimePicker key="tp" position="bottom" />] : []}
        inputClass={`form-control${isInvalid ? ' is-invalid' : ''}`}
        containerStyle={{ width: '100%' }}
        onChange={(dateObject: DateObject | null) => {
          if (onChange && dateObject) {
            onChange(dateObject.toDate())
          }
        }}
      />
      {isInvalid && feedback ? <div className="invalid-feedback d-block">{feedback}</div> : null}
    </div>
  )
}

export default LocaleAwareDatePicker
