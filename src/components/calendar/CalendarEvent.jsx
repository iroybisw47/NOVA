import { getEventColor } from '../../context/CalendarContext'
import './CalendarEvent.css'

const truncateName = (name, maxLen = 20) =>
  name.length > maxLen ? name.substring(0, maxLen - 1) + '…' : name

export default function CalendarEvent({ event, style, onClick }) {
  const color = getEventColor(event)
  const startTime = new Date(event.start.dateTime)
  const timeStr = startTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })
  const showLocation = event.location && parseInt(style.height) > 50

  return (
    <div
      className="cal-event"
      onClick={(e) => { e.stopPropagation(); onClick?.() }}
      style={{
        top: style.top,
        height: style.height,
        backgroundColor: color.bg,
        borderLeftColor: color.border,
        color: color.text,
        ...(style.zIndex != null && { zIndex: style.zIndex }),
      }}
    >
      <div className="cal-event__name">{truncateName(event.summary, 18)}</div>
      <div className="cal-event__time">{timeStr}</div>
      {showLocation && (
        <div className="cal-event__location">{truncateName(event.location, 15)}</div>
      )}
    </div>
  )
}

export function AllDayEvent({ event }) {
  const color = getEventColor(event)

  return (
    <div
      className="cal-event--allday"
      style={{
        backgroundColor: color.bg,
        borderLeftColor: color.border,
        color: color.text,
      }}
    >
      {truncateName(event.summary, 15)}
    </div>
  )
}
