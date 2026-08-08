import React, { useMemo, useState } from 'react'
import persian from 'react-date-object/calendars/persian'
import persianFa from 'react-date-object/locales/persian_fa'
import { Calendar, DateObject } from 'react-multi-date-picker'

import format from '../../shared/util/formatDate'

interface AppointmentEvent {
  id: string
  start: Date
  end: Date
  title: string
  allDay: boolean
}

interface Props {
  events: AppointmentEvent[]
  onEventClick: (event: AppointmentEvent) => void
}

const isSameDay = (left: Date, right: Date) =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate()

const JalaliAppointmentCalendar = ({ events, onEventClick }: Props) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())

  const selectedEvents = useMemo(
    () => events.filter((event) => isSameDay(event.start, selectedDate)),
    [events, selectedDate],
  )

  return (
    <div className="hr-jalali-appointment-calendar" dir="rtl">
      <Calendar
        calendar={persian}
        locale={persianFa}
        value={selectedDate}
        onChange={(date: DateObject | null) => {
          if (date) {
            setSelectedDate(date.toDate())
          }
        }}
        mapDays={({ date }) => {
          const count = events.filter((event) => isSameDay(event.start, date.toDate())).length
          if (count === 0) {
            return {}
          }
          return {
            title: `${count} نوبت`,
            style: {
              backgroundColor: '#0d6efd',
              color: '#fff',
              fontWeight: 700,
            },
          }
        }}
      />

      <section className="hr-jalali-appointment-list" aria-live="polite">
        <h4>{format(selectedDate, 'EEEE، d MMMM yyyy')}</h4>
        {selectedEvents.length === 0 ? (
          <p>برای این روز نوبتی ثبت نشده است.</p>
        ) : (
          selectedEvents.map((event) => (
            <button
              type="button"
              className="hr-jalali-appointment-item"
              key={event.id}
              onClick={() => onEventClick(event)}
            >
              <strong>{event.title}</strong>
              <span>
                {format(event.start, 'HH:mm')} تا {format(event.end, 'HH:mm')}
              </span>
            </button>
          ))
        )}
      </section>
    </div>
  )
}

export default JalaliAppointmentCalendar
