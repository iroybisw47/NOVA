import { useCalendar, eventIsOnDate, formatEventTimeRange, isHolidayEvent, isCanvasAllDayEvent } from '../../context/CalendarContext'
import './TodayEvents.css'

export default function TodayEvents() {
  const { allEvents, deleteEventById } = useCalendar()
  const todayEvents = allEvents.filter(e => eventIsOnDate(e, new Date()) && !isHolidayEvent(e) && !isCanvasAllDayEvent(e))

  return (
    <div className="today-events">
      <div className="today-events__header">
        <h3 className="today-events__title">Today's Events</h3>
      </div>
      <div className="today-events__list">
        {todayEvents.length > 0 ? todayEvents.map(event => (
          <div key={event.id} className="today-events__item">
            <div className="today-events__item-row">
              <div style={{ flex: 1 }}>
                <p className="today-events__item-name">{event.summary}</p>
                <p className="today-events__item-time">{formatEventTimeRange(event)}</p>
                {event.location && <p className="today-events__item-location">📍 {event.location}</p>}
              </div>
              <button
                onClick={() => deleteEventById(event.id, event.calendarId)}
                className="today-events__delete"
                title="Delete event"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        )) : <p className="today-events__empty">No events today</p>}
      </div>
    </div>
  )
}
