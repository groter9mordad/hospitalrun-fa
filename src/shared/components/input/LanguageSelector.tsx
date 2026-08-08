import { Select, Label } from '@hospitalrun/components'
import React from 'react'

import { resources } from '../../config/i18n'
import useTranslator from '../../hooks/useTranslator'
import { SelectOption } from './SelectOption'

const LanguageSelector = () => {
  const { t } = useTranslator()
  const languageOptions: SelectOption[] = [{ label: resources.fa.name, value: 'fa' }]

  return (
    <>
      <Label text={t('settings.language.label')} title={t('settings.language.label')} />
      <Select id="language" options={languageOptions} defaultSelected={languageOptions} disabled />
    </>
  )
}

export default LanguageSelector
