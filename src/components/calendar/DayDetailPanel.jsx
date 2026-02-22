import { useState } from 'react'
import { useCalendar, eventIsOnDate, isHolidayEvent, isCanvasAllDayEvent, getEventColor, isRecurringEvent, GOOGLE_COLOR_MAP } from '../../context/CalendarContext'
import './DayDetailPanel.css'

export default function DayDetailPanel() {
  const { selectedCalendarDay, setSelectedCalendarDay, allEvents, setAllEvents, deleteEventById, updateEventById, editRecurringEvent } = useCalendar()
  const [editingEvent, setEditingEvent] = useState(null) // { id, field }
  const [editValue, setEditValue] = useState('')
  const [deletingIds, setDeletingIds] = useState(new Set())

  if (!selectedCalendarDay) return null

  const dayEvents = allEvents
    .filter(e => eventIsOnDate(e, selectedCalendarDay) && !isHolidayEvent(e) && !isCanvasAllDayEvent(e))
    .sort((a, b) => {
      if (!a.start.dateTime && b.start.dateTime) return -1
      if (a.start.dateTime && !b.start.dateTime) return 1
      if (a.start.dateTime && b.start.dateTime) return new Date(a.start.dateTime) - new Date(b.start.dateTime)
      return 0
    })

  return (
    <div className="day-detail">
      <div className="day-detail__card">
        <div className="day-detail__header">
          <div className="day-detail__header-top">
            <div>
              <div className="day-detail__weekday">
                {selectedCalendarDay.toLocaleDateString('en-US', { weekday: 'long' })}
              </div>
              <div className="day-detail__date">
                {selectedCalendarDay.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
              </div>
            </div>
            <button onClick={() => setSelectedCalendarDay(null)} className="day-detail__close">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="day-detail__events">
          {dayEvents.length === 0 ? (
            <div className="day-detail__empty">
              <div className="day-detail__empty-icon">📅</div>
              <p className="day-detail__empty-text">No events scheduled</p>
            </div>
          ) : (
            dayEvents.map((event, i) => {
              const color = getEventColor(event)
              const isAllDay = event.start.date && !event.start.dateTime
              const startTime = event.start.dateTime ? new Date(event.start.dateTime) : null
              const endTime = event.end.dateTime ? new Date(event.end.dateTime) : null
              const timeStr = isAllDay
                ? 'All day'
                : `${startTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })} - ${endTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}`

              const handleColorChange = async (colorId) => {
                // Optimistic update
                setAllEvents(prev => prev.map(e => e.id === event.id ? { ...e, colorId } : e))
                if (isRecurringEvent(event)) {
                  await editRecurringEvent(event, 'all', { colorId })
                } else {
                  await updateEventById(event.id, event.calendarId, { colorId })
                }
              }

              const handleDelete = async () => {
                setDeletingIds(prev => new Set(prev).add(event.id))
                await deleteEventById(event.id, event.calendarId)
                setDeletingIds(prev => { const next = new Set(prev); next.delete(event.id); return next })
              }

              const startEdit = (field, value) => {
                setEditingEvent({ id: event.id, field })
                setEditValue(value || '')
              }

              const commitEdit = async () => {
                if (!editingEvent) return
                const { field } = editingEvent
                const updates = {}
                if (field === 'summary') updates.summary = editValue
                else if (field === 'location') updates.location = editValue
                else if (field === 'time') {
                  const match = editValue.match(/^(\d{1,2}):(\d{2})\s*(am|pm)?$/i)
                  if (match) {
                    let h = parseInt(match[1]), m = parseInt(match[2])
                    if (match[3]?.toLowerCase() === 'pm' && h < 12) h += 12
                    if (match[3]?.toLowerCase() === 'am' && h === 12) h = 0
                    updates.startTime = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`
                  }
                }
                setEditingEvent(null)
                if (Object.keys(updates).length > 0) {
                  await updateEventById(event.id, event.calendarId, updates)
                }
              }

              const handleEditKeyDown = (e) => {
                if (e.key === 'Enter') commitEdit()
                if (e.key === 'Escape') setEditingEvent(null)
              }

              const isEditing = (field) => editingEvent?.id === event.id && editingEvent?.field === field
              const isDeleting = deletingIds.has(event.id)

              return (
                <div key={i} className={`day-detail__event ${isDeleting ? 'day-detail__event--deleting' : ''}`} style={{ borderLeftColor: color.border, backgroundColor: color.bg }}>
                  {isEditing('summary') ? (
                    <input
                      className="day-detail__edit-input"
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      onBlur={commitEdit}
                      onKeyDown={handleEditKeyDown}
                      autoFocus
                    />
                  ) : (
                    <div className="day-detail__event-name day-detail__editable" style={color.text ? { color: color.text } : undefined} onClick={() => startEdit('summary', event.summary)}>{event.summary}</div>
                  )}
                  <div className="day-detail__event-meta" style={color.text ? { color: color.text } : undefined}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
                    </svg>
                    {isEditing('time') ? (
                      <input
                        className="day-detail__edit-input day-detail__edit-input--small"
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        onBlur={commitEdit}
                        onKeyDown={handleEditKeyDown}
                        placeholder="3:00 PM"
                        autoFocus
                      />
                    ) : (
                      <span className={isAllDay ? '' : 'day-detail__editable'} onClick={() => !isAllDay && startEdit('time', startTime ? startTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }) : '')}>{timeStr}</span>
                    )}
                  </div>
                  {(event.location || isEditing('location')) && (
                    <div className="day-detail__event-meta" style={color.text ? { color: color.text } : undefined}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" />
                      </svg>
                      {isEditing('location') ? (
                        <input
                          className="day-detail__edit-input day-detail__edit-input--small"
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          onBlur={commitEdit}
                          onKeyDown={handleEditKeyDown}
                          autoFocus
                        />
                      ) : (
                        <span className="day-detail__editable" onClick={() => startEdit('location', event.location)}>{event.location}</span>
                      )}
                    </div>
                  )}
                  {event.description && (
                    <div className="day-detail__event-desc">
                      {event.description.substring(0, 100)}{event.description.length > 100 ? '...' : ''}
                    </div>
                  )}
                  <div className="day-detail__color-picker">
                    {Object.entries(GOOGLE_COLOR_MAP).map(([id, c]) => (
                      <button
                        key={id}
                        className={`day-detail__color-swatch ${String(event.colorId) === id ? 'day-detail__color-swatch--active' : ''}`}
                        style={{ backgroundColor: c.bg }}
                        title={c.name}
                        onClick={() => handleColorChange(id)}
                      />
                    ))}
                  </div>
                  <div className="day-detail__event-actions">
                    <button
                      onClick={handleDelete}
                      className="day-detail__delete-btn"
                      disabled={isDeleting}
                    >
                      {isDeleting ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
