import i18n from '../../../shared/config/i18n'
import Appointment from '../../../shared/model/Appointment'
import Lab from '../../../shared/model/Lab'
import { PatientHistoryRecord, HistoryRecordType } from '../../../shared/model/PatientHistoryRecord'

export const convertLab = (lab: Lab): PatientHistoryRecord[] => {
  const labEvents = []
  if (lab.requestedOn) {
    labEvents.push({
      date: new Date(lab.requestedOn),
      type: HistoryRecordType.LAB,
      info: `${i18n.t('patient.history.events.labRequested')} - ${lab.type}`,
      recordId: lab.id,
      id: `requestedLab${lab.id}`,
    })
  }
  if (lab.canceledOn) {
    labEvents.push({
      date: new Date(lab.canceledOn),
      type: HistoryRecordType.LAB,
      info: `${i18n.t('patient.history.events.labCanceled')} - ${lab.type}`,
      recordId: lab.id,
      id: `canceledLab${lab.id}`,
    })
  } else if (lab.completedOn) {
    labEvents.push({
      date: new Date(lab.completedOn),
      type: HistoryRecordType.LAB,
      info: `${i18n.t('patient.history.events.labCompleted')} - ${lab.type}`,
      recordId: lab.id,
      id: `completedLab${lab.id}`,
    })
  }
  return labEvents
}

export const convertAppointment = (appt: Appointment): PatientHistoryRecord[] => {
  const apptEvents = []
  if (appt.startDateTime) {
    apptEvents.push({
      date: new Date(appt.startDateTime),
      type: HistoryRecordType.APPOINTMENT,
      info: `${i18n.t('patient.history.events.appointmentStarted')} - ${appt.type}`,
      recordId: appt.id,
      id: `startedAppt${appt.id}`,
    })
  }
  if (appt.endDateTime) {
    apptEvents.push({
      date: new Date(appt.endDateTime),
      type: HistoryRecordType.APPOINTMENT,
      info: `${i18n.t('patient.history.events.appointmentEnded')} - ${appt.type}`,
      recordId: appt.id,
      id: `endedAppt${appt.id}`,
    })
  }
  return apptEvents
}
