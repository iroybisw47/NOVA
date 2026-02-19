import { useState } from 'react'
import { useCalendar, isSameDay, eventIsOnDate, isHolidayEvent, isCanvasAllDayEvent } from '../../context/CalendarContext'
import CalendarEvent, { AllDayEvent } from './CalendarEvent'
import './TimeGrid.css'

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const HOURS = Array.from({ length: 15 }, (_, i) => i + 7) // 7 AM to 9 PM

const formatHour = (hour) =>
  hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`

const getEventStyle = (event) => {
  if (!event.start.dateTime) return null
  const start = new Date(event.start.dateTime)
  const end = new Date(event.end.dateTime)
  const startHour = start.getHours() + start.getMinutes() / 60
  const endHour = end.getHours() + end.getMinutes() / 60
  const top = Math.max(0, (startHour - 7) * 60)
  const height = Math.max(30, (endHour - startHour) * 60)
  return { top: `${top}px`, height: `${height}px` }
}

export default function TimeGrid({ weekDates }) {
  const { allEvents, selectedCalendarDay, setSelectedCalendarDay } = useCalendar()
  const [focusedEventId, setFocusedEventId] = useState(null)
  const today = new Date()

  const getEventsForDay = (date) =>
    allEvents.filter(e => eventIsOnDate(e, date) && !isHolidayEvent(e) && !isCanvasAllDayEvent(e))

  return (
    <div className="time-grid">
      {/* Day Headers */}
      <div className="time-grid__headers">
        <div className="time-grid__corner" />
        {weekDates.map((date, i) => {
          const isToday_ = isSameDay(date, today)
          const isWeekend = i === 0 || i === 6
          const isSelected = selectedCalendarDay && isSameDay(date, selectedCalendarDay)
          return (
            <div
              key={i}
              onClick={() => setSelectedCalendarDay(date)}
              className={`time-grid__day-header ${isWeekend ? 'time-grid__day-header--weekend' : ''} ${isSelected ? 'time-grid__day-header--selected' : ''}`}
            >
              <div className={`time-grid__day-name ${isToday_ ? 'time-grid__day-name--today' : ''}`}>
                {DAY_NAMES[i]}
              </div>
              <div className={`time-grid__day-number ${isToday_ ? 'time-grid__day-number--today' : ''}`}>
                {date.getDate()}
              </div>
            </div>
          )
        })}
      </div>

      {/* Time Grid Body */}
      <div className="time-grid__body">
        <div className="time-grid__labels">
          {HOURS.map(hour => (
            <div key={hour} className="time-grid__label">{formatHour(hour)}</div>
          ))}
        </div>

        {weekDates.map((date, dayIndex) => {
          const dayEvents = getEventsForDay(date)
          const timedEvents = dayEvents.filter(e => e.start.dateTime)
          const allDayEvents = dayEvents.filter(e => e.start.date && !e.start.dateTime)
          const isWeekend = dayIndex === 0 || dayIndex === 6

          return (
            <div
              key={dayIndex}
              className={`time-grid__column ${isWeekend ? 'time-grid__column--weekend' : ''}`}
            >
              {HOURS.map(hour => (
                <div key={hour} className="time-grid__hour-cell" />
              ))}

              {allDayEvents.length > 0 && (
                <div className="time-grid__allday-container">
                  {allDayEvents.slice(0, 2).map((event, j) => (
                    <AllDayEvent key={j} event={event} />
                  ))}
                </div>
              )}

              {timedEvents.map((event, j) => {
                const style = getEventStyle(event)
                if (!style) return null
                const eventId = event.id || `${dayIndex}-${j}`
                return (
                  <CalendarEvent
                    key={j}
                    event={event}
                    style={{
                      ...style,
                      zIndex: focusedEventId === eventId ? 50 : undefined,
                    }}
                    onClick={() => {
                      setFocusedEventId(eventId)
                      setSelectedCalendarDay(date)
                    }}
                  />
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
