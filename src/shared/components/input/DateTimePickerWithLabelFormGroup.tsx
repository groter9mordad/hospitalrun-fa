import { Label } from '@hospitalrun/components'
import React from 'react'

import LocaleAwareDatePicker from './LocaleAwareDatePicker'

interface Props {
  name: string
  label: string
  value: Date | undefined
  isEditable?: boolean
  isRequired?: boolean
  onChange?: (date: Date) => void
  feedback?: string
  isInvalid?: boolean
}

const DateTimePickerWithLabelFormGroup = (props: Props) => {
  const { onChange, label, name, isEditable, value, isRequired, feedback, isInvalid } = props
  const id = `${name}DateTimePicker`
  return (
    <div className="form-group" data-testid={id}>
      <Label text={label} isRequired={isRequired} htmlFor={id} />
      <LocaleAwareDatePicker
        id={id}
        value={value}
        isEditable={isEditable}
        isInvalid={isInvalid}
        feedback={feedback}
        withTime
        onChange={(inputDate) => {
          if (onChange) {
            onChange(inputDate)
          }
        }}
      />
    </div>
  )
}

export default DateTimePickerWithLabelFormGroup
