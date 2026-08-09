import { Label } from '@hospitalrun/components'
import React from 'react'

import LocaleAwareDatePicker from './LocaleAwareDatePicker'

interface Props {
  name: string
  label: string
  value: Date | undefined
  isEditable?: boolean
  onChange?: (date: Date) => void
  isRequired?: boolean
  feedback?: string
  isInvalid?: boolean
  maxDate?: Date
}

const DatePickerWithLabelFormGroup = (props: Props) => {
  const {
    onChange,
    label,
    name,
    isEditable,
    value,
    isRequired,
    feedback,
    isInvalid,
    maxDate,
  } = props
  const id = `${name}DatePicker`
  return (
    <div className="form-group" data-testid={id}>
      <Label
        text={label}
        htmlFor={id}
        isRequired={isRequired}
        title={isRequired ? 'این فیلد الزامی است' : undefined}
      />
      <LocaleAwareDatePicker
        id={id}
        value={value}
        isEditable={isEditable}
        isInvalid={isInvalid}
        feedback={feedback}
        maxDate={maxDate}
        onChange={(inputDate) => {
          if (onChange) {
            onChange(inputDate)
          }
        }}
      />
    </div>
  )
}

export default DatePickerWithLabelFormGroup
