import { MutateFunction, queryCache, useMutation } from 'react-query'

import AppointmentRepository from '../../shared/db/AppointmentRepository'
import PatientRepository from '../../shared/db/PatientRepository'
import Appointment from '../../shared/model/Appointment'
import validateAppointment, { AppointmentError } from '../appointments/util/validate-appointment'

interface newAppointmentResult {
  mutate: MutateFunction<Appointment, unknown, Appointment, unknown>
  isLoading: boolean
  isError: boolean
  validator(appointment: Appointment): AppointmentError
}

async function resolvePatientBeforeSave(appointment: Appointment): Promise<Appointment> {
  if (appointment.patient) {
    return appointment
  }

  const patientInput = document.getElementById('patientTypeahead') as HTMLInputElement | null
  const query = patientInput?.value.trim()
  if (!query) {
    return appointment
  }

  const matches = await PatientRepository.search(query)
  if (matches.length !== 1) {
    return appointment
  }

  return { ...appointment, patient: matches[0].id } as Appointment
}

async function createNewAppointment(appointment: Appointment): Promise<Appointment> {
  const appointmentToSave = await resolvePatientBeforeSave(appointment)
  const validationError = validateAppointment(appointmentToSave)
  if (Object.keys(validationError).length > 0) {
    throw validationError
  }
  return AppointmentRepository.save(appointmentToSave)
}

function validateCreateAppointment(appointment: Appointment): AppointmentError {
  return validateAppointment(appointment)
}

export default function useScheduleAppointment(): newAppointmentResult {
  const [mutate, { isLoading, isError }] = useMutation(createNewAppointment, {
    onSuccess: async () => {
      await queryCache.invalidateQueries('appointment')
    },
    throwOnError: true,
  })
  const result: newAppointmentResult = {
    mutate,
    isLoading,
    isError,
    validator: validateCreateAppointment,
  }
  return result
}
