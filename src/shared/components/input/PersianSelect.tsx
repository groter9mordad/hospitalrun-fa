import { Select as HospitalRunSelect } from '@hospitalrun/components'
import React from 'react'

interface SelectOption<T> {
  label: string
  value: T
}

interface Props<T> {
  id: string
  options: SelectOption<T>[]
  defaultSelected?: SelectOption<T>[]
  onChange?: (values: T[]) => void
  placeholder?: string
  multiple?: boolean
  disabled?: boolean
  isValid?: boolean
  isInvalid?: boolean
  feedback?: string
}

/** HospitalRun's select with a Persian-only default placeholder. */
function PersianSelect<T>(props: Props<T>) {
  const { placeholder, ...selectProps } = props
  return <HospitalRunSelect {...selectProps} placeholder={placeholder || 'انتخاب کنید'} />
}

export default PersianSelect
