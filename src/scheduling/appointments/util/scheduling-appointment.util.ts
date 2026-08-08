import Appointment from '../../../shared/model/Appointment'
import format from '../../../shared/util/formatDate'

export function getAppointmentLabel(appointment: Appointment | undefined) {
  if (!appointment) {
    return ''
  }

  const { id, startDateTime, endDateTime } = appointment

  return startDateTime && endDateTime
    ? `${format(new Date(startDateTime), 'yyyy/MM/dd HH:mm')} - ${format(
        new Date(endDateTime),
        'yyyy/MM/dd HH:mm',
      )}`
    : id
}
