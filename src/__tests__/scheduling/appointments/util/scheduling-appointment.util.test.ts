import { getAppointmentLabel } from '../../../../scheduling/appointments/util/scheduling-appointment.util'
import Appointment from '../../../../shared/model/Appointment'
import format from '../../../../shared/util/formatDate'

describe('scheduling appointment util', () => {
  describe('getAppointmentLabel', () => {
    it('should return the locale string representation of the start time and end time', () => {
      const appointment = {
        id: '123',
        startDateTime: '2020-03-07T18:15:00.000Z',
        endDateTime: '2020-03-07T20:15:00.000Z',
      } as Appointment

      const startDateLabel = format(new Date(appointment.startDateTime), 'yyyy/MM/dd HH:mm')
      const endDateLabel = format(new Date(appointment.endDateTime), 'yyyy/MM/dd HH:mm')

      expect(getAppointmentLabel(appointment)).toEqual(`${startDateLabel} - ${endDateLabel}`)
    })

    it('should return the appointment id when start time is not defined', () => {
      const appointment = {
        id: '123',
        startDateTime: '2020-03-07T18:15:00.000Z',
      } as Appointment

      expect(getAppointmentLabel(appointment)).toEqual('123')
    })

    it('should return the appointment id when end time is not defined', () => {
      const appointment = {
        id: '123',
        endDateTime: '2020-03-07T20:15:00.000Z',
      } as Appointment

      expect(getAppointmentLabel(appointment)).toEqual('123')
    })

    it('should return the appointment id when start time and end time are not defined', () => {
      const appointment = {
        id: '123',
      } as Appointment

      expect(getAppointmentLabel(appointment)).toEqual('123')
    })
  })
})
