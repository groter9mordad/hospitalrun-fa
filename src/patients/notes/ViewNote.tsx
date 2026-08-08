import React from 'react'
import { useParams } from 'react-router-dom'

import TextInputWithLabelFormGroup from '../../shared/components/input/TextInputWithLabelFormGroup'
import Loading from '../../shared/components/Loading'
import useTranslator from '../../shared/hooks/useTranslator'
import format from '../../shared/util/formatDate'
import usePatientNote from '../hooks/usePatientNote'

const ViewNote = () => {
  const { t } = useTranslator()
  const { noteId, id: patientId } = useParams()
  const { data, status } = usePatientNote(patientId, noteId)

  if (data === undefined || status === 'loading') {
    return <Loading />
  }

  return (
    <div>
      <p>
        {t('patient.notes.date')}: {format(new Date(data.date), 'yyyy/MM/dd HH:mm')}
      </p>
      <TextInputWithLabelFormGroup
        name="text"
        label={t('patient.note')}
        isEditable={false}
        placeholder={t('patient.note')}
        value={data.text}
      />
    </div>
  )
}

export default ViewNote
