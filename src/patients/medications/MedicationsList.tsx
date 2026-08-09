import { Alert, Table } from '@hospitalrun/components'
import React from 'react'
import { useHistory } from 'react-router-dom'

import {
  medicationIntentTranslationKey,
  medicationPriorityTranslationKey,
  medicationStatusTranslationKey,
} from '../../medications/util/translationKeys'
import Loading from '../../shared/components/Loading'
import useTranslator from '../../shared/hooks/useTranslator'
import Patient from '../../shared/model/Patient'
import format from '../../shared/util/formatDate'
import usePatientMedications from '../hooks/usePatientMedications'

interface Props {
  patient: Patient
}

const MedicationsList = (props: Props) => {
  const { patient } = props
  const history = useHistory()
  const { t } = useTranslator()
  const { data, status } = usePatientMedications(patient.id)

  if (data === undefined || status === 'loading') {
    return <Loading />
  }

  if (data.length === 0) {
    return (
      <Alert
        color="warning"
        title={t('patient.medications.warning.noMedications')}
        message={t('patient.medications.noMedicationsMessage')}
      />
    )
  }

  return (
    <Table
      actionsHeaderText={t('actions.label')}
      getID={(row) => row.id}
      data={data}
      columns={[
        { label: t('medications.medication.medication'), key: 'medication' },
        {
          label: t('medications.medication.priority'),
          key: 'priority',
          formatter: (row) => t(medicationPriorityTranslationKey(row.priority)),
        },
        {
          label: t('medications.medication.intent'),
          key: 'intent',
          formatter: (row) => t(medicationIntentTranslationKey(row.intent)),
        },
        {
          label: t('medications.medication.requestedOn'),
          key: 'requestedOn',
          formatter: (row) =>
            row.requestedOn ? format(new Date(row.requestedOn), 'yyyy-MM-dd hh:mm a') : '',
        },
        {
          label: t('medications.medication.status'),
          key: 'status',
          formatter: (row) => t(medicationStatusTranslationKey(row.status)),
        },
      ]}
      actions={[
        { label: t('actions.view'), action: (row) => history.push(`/medications/${row.id}`) },
      ]}
    />
  )
}

export default MedicationsList
