import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useAuth } from './AuthContext'

const CalendarContext = createContext()

// ========== HELPER FUNCTIONS ==========
export const formatDate = (date) => date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
export const formatShortDate = (date) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
export const getDateString = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

export const parseLocalDate = (dateStr) => {
  if (!dateStr) return new Date()
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export const toTaskDueDate = (dateStr) => {
  const [y, m, d] = dateStr.split('-').map(Number)
  const localDate = new Date(y, m - 1, d, 12, 0, 0)
  return localDate.toISOString()
}

export const parseTaskDueDate = (isoString) => {
  if (!isoString) return null
  const datePart = isoString.split('T')[0]
  return parseLocalDate(datePart)
}

export const formatTime12h = (time24) => {
  if (!time24) return ''
  const [h, m] = time24.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`
}

export const formatDuration = (minutes) => {
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
}

export const isSameDay = (d1, d2) => d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate()
export const isToday = (date) => isSameDay(date, new Date())

export const getEventDate = (event) => {
  if (event.start.dateTime) return new Date(event.start.dateTime)
  if (event.start.date) { const [y, m, d] = event.start.date.split('-').map(Number); return new Date(y, m - 1, d) }
  return new Date()
}

export const eventIsOnDate = (event, targetDate) => {
  const ed = getEventDate(event)
  return ed.getFullYear() === targetDate.getFullYear() && ed.getMonth() === targetDate.getMonth() && ed.getDate() === targetDate.getDate()
}

export const formatEventTimeRange = (event) => {
  if (event.start.date && !event.start.dateTime) return 'All day'
  const start = new Date(event.start.dateTime)
  const end = new Date(event.end.dateTime)
  return `${start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })} - ${end.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}`
}

export const isCanvasEvent = (event) => {
  const calendarName = (event.calendarName || '').toLowerCase()
  return calendarName.includes('canvas') || calendarName.includes('instructure')
}

export const isCanvasAllDayEvent = (event) => {
  return isCanvasEvent(event) && event.start.date && !event.start.dateTime
}

export const isHolidayEvent = (event) => {
  const calendarName = (event.calendarName || '').toLowerCase()
  return calendarName.includes('holiday')
}

export const isRecurringEvent = (event) => !!(event.recurringEventId || event.recurrence)

export const GOOGLE_COLOR_MAP = {
  '1':  { name: 'Tomato',    bg: '#d50000', border: '#b71c1c', text: '#ffffff' },
  '2':  { name: 'Flamingo',  bg: '#e67c73', border: '#c62828', text: '#ffffff' },
  '3':  { name: 'Tangerine', bg: '#f4511e', border: '#d84315', text: '#ffffff' },
  '4':  { name: 'Banana',    bg: '#f6bf26', border: '#f9a825', text: '#333333' },
  '5':  { name: 'Sage',      bg: '#33b679', border: '#2e7d32', text: '#ffffff' },
  '6':  { name: 'Basil',     bg: '#0b8043', border: '#1b5e20', text: '#ffffff' },
  '7':  { name: 'Peacock',   bg: '#039be5', border: '#0277bd', text: '#ffffff' },
  '8':  { name: 'Blueberry', bg: '#3f51b5', border: '#283593', text: '#ffffff' },
  '9':  { name: 'Lavender',  bg: '#7986cb', border: '#3949ab', text: '#ffffff' },
  '10': { name: 'Grape',     bg: '#8e24aa', border: '#6a1b9a', text: '#ffffff' },
  '11': { name: 'Graphite',  bg: '#616161', border: '#424242', text: '#ffffff' },
}

export const getEventColor = (event) => {
  if (event.colorId && GOOGLE_COLOR_MAP[String(event.colorId)]) {
    return GOOGLE_COLOR_MAP[String(event.colorId)]
  }
  const calName = (event.calendarName || '').toLowerCase()
  if (calName.includes('canvas') || calName.includes('instructure')) return { bg: '#fef3c7', border: '#f59e0b', text: '#92400e' }
  if (calName.includes('personal')) return { bg: '#dbeafe', border: '#3b82f6', text: '#1e40af' }
  if (calName.includes('work')) return { bg: '#dcfce7', border: '#22c55e', text: '#166534' }
  return { bg: '#eef2ff', border: '#6366f1', text: '#4338ca' }
}

export function CalendarProvider({ children }) {
  const { accessToken, clearToken, isSignedIn } = useAuth()
  const [calendarEvents, setCalendarEvents] = useState([])
  const [allEvents, setAllEvents] = useState([])
  const [calendarList, setCalendarList] = useState([])
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [calendarViewDate, setCalendarViewDate] = useState(new Date())
  const [selectedCalendarDay, setSelectedCalendarDay] = useState(null)
  const [primaryCalendarId, setPrimaryCalendarId] = useState('primary')

  const fetchCalendarList = async (token) => {
    try {
      const r = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', { headers: { Authorization: `Bearer ${token}` } })
      if (r.status === 401) return []
      const data = await r.json()
      const primary = data.items?.find(c => c.primary)
      if (primary) setPrimaryCalendarId(primary.id)
      return data.items || []
    } catch (e) { return [] }
  }

  const fetchEventsFromAllCalendars = async (token, startDate, endDate, calendars) => {
    const all = []
    for (const cal of calendars) {
      try {
        const r = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(cal.id)}/events?timeMin=${startDate.toISOString()}&timeMax=${endDate.toISOString()}&singleEvents=true&orderBy=startTime`, { headers: { Authorization: `Bearer ${token}` } })
        if (r.status === 401) return []
        const d = await r.json()
        if (d.items) all.push(...d.items.map(e => ({ ...e, calendarId: cal.id, calendarName: cal.summary })))
      } catch (e) {}
    }
    return all.sort((a, b) => getEventDate(a) - getEventDate(b))
  }

  const fetchEventsForDate = async (token, date, calendars) => {
    const start = new Date(date); start.setHours(0, 0, 0, 0)
    const end = new Date(date); end.setHours(23, 59, 59, 999)
    return (await fetchEventsFromAllCalendars(token, start, end, calendars)).filter(e => eventIsOnDate(e, date))
  }

  const fetchEventsForMonth = async (token, date, calendars) => {
    const start = new Date(date.getFullYear(), date.getMonth(), 1)
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999)
    return await fetchEventsFromAllCalendars(token, start, end, calendars)
  }

  const refreshCurrentView = async () => {
    if (!accessToken || !calendarList.length) return
    const events = await fetchEventsForDate(accessToken, selectedDate, calendarList)
    setCalendarEvents(events.filter(e => !isHolidayEvent(e) && !isCanvasAllDayEvent(e)))
  }

  const createEvent = async (data, skipConflictCheck = false) => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    const dur = data.duration || 60
    const addMinutes = (t, m) => {
      const [h, min] = t.split(':').map(Number)
      const total = h * 60 + min + m
      return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
    }
    if (!skipConflictCheck) {
      const conflictCheck = await checkForConflicts(data.date, data.startTime, dur)
      if (conflictCheck.hasConflict) return { success: false, hasConflict: true, conflicts: conflictCheck.conflicts, pendingEvent: data }
    }
    const body = {
      summary: data.title,
      start: { dateTime: `${data.date}T${data.startTime}:00`, timeZone: tz },
      end: { dateTime: `${data.date}T${addMinutes(data.startTime, dur)}:00`, timeZone: tz }
    }
    if (data.location) body.location = data.location
    if (data.description) body.description = data.description
    if (data.colorId) body.colorId = String(data.colorId)
    try {
      const r = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(primaryCalendarId)}/events`, {
        method: 'POST', headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (r.ok) { await refreshCurrentView(); return { success: true } }
      return { success: false }
    } catch { return { success: false } }
  }

  const deleteEventById = async (eventId, calId = null) => {
    try {
      const r = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId || primaryCalendarId)}/events/${eventId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` } })
      if (r.ok || r.status === 204) { await refreshCurrentView(); return { success: true } }
      return { success: false }
    } catch (e) { return { success: false } }
  }

  const checkForConflicts = async (dateStr, startTime, durationMins) => {
    if (!accessToken || !calendarList.length) return { hasConflict: false, conflicts: [] }
    const [y, m, d] = dateStr.split('-').map(Number)
    const [h, min] = startTime.split(':').map(Number)
    const eventStart = new Date(y, m - 1, d, h, min)
    const eventEnd = new Date(eventStart.getTime() + durationMins * 60000)
    const targetDate = new Date(y, m - 1, d)
    const events = await fetchEventsForDate(accessToken, targetDate, calendarList)
    const timedEvents = events.filter(e => !isHolidayEvent(e) && e.start.dateTime)
    const conflicts = timedEvents.filter(e => {
      const existingStart = new Date(e.start.dateTime)
      const existingEnd = new Date(e.end.dateTime)
      return existingStart < eventEnd && existingEnd > eventStart
    })
    return { hasConflict: conflicts.length > 0, conflicts }
  }

  const buildRecurrenceRule = (recurrence) => {
    let rule = `RRULE:FREQ=${recurrence.frequency.toUpperCase()}`
    if (recurrence.interval && recurrence.interval > 1) rule += `;INTERVAL=${recurrence.interval}`
    if (recurrence.daysOfWeek && recurrence.daysOfWeek.length > 0) rule += `;BYDAY=${recurrence.daysOfWeek.join(',')}`
    if (recurrence.until) { const [y, m, d] = recurrence.until.split('-'); rule += `;UNTIL=${y}${String(m).padStart(2,'0')}${String(d).padStart(2,'0')}T235959Z` }
    return rule
  }

  const createRecurringEvent = async (data) => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    const dur = data.duration || 60
    const addMinutes = (t, m) => { const [h, min] = t.split(':').map(Number); const total = h * 60 + min + m; return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}` }
    const body = {
      summary: data.title,
      start: { dateTime: `${data.date}T${data.startTime}:00`, timeZone: tz },
      end: { dateTime: `${data.date}T${addMinutes(data.startTime, dur)}:00`, timeZone: tz },
      recurrence: [buildRecurrenceRule(data.recurrence)]
    }
    if (data.location) body.location = data.location
    if (data.description) body.description = data.description
    if (data.colorId) body.colorId = String(data.colorId)
    try {
      const r = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(primaryCalendarId)}/events`, {
        method: 'POST', headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (r.ok) { await refreshCurrentView(); return { success: true } }
      return { success: false }
    } catch (e) { return { success: false } }
  }

  const deleteRecurringEvent = async (event, scope) => {
    try {
      if (scope === 'all') {
        const baseId = event.recurringEventId || event.id.split('_')[0]
        const r = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(event.calendarId || primaryCalendarId)}/events/${baseId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` } })
        if (r.ok || r.status === 204) { await refreshCurrentView(); return { success: true } }
      } else {
        const r = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(event.calendarId || primaryCalendarId)}/events/${event.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` } })
        if (r.ok || r.status === 204) { await refreshCurrentView(); return { success: true } }
      }
      return { success: false }
    } catch (e) { return { success: false } }
  }

  const editRecurringEvent = async (event, scope, updates) => {
    try {
      const calId = event.calendarId || primaryCalendarId
      const targetId = scope === 'all' ? (event.recurringEventId || event.id.split('_')[0]) : event.id
      const getR = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId)}/events/${targetId}`, { headers: { Authorization: `Bearer ${accessToken}` } })
      if (!getR.ok) return { success: false }
      const targetEvent = await getR.json()
      if (updates.title) targetEvent.summary = updates.title
      if (updates.location !== undefined) targetEvent.location = updates.location
      if (updates.description !== undefined) targetEvent.description = updates.description
      if (updates.colorId !== undefined) targetEvent.colorId = updates.colorId ? String(updates.colorId) : undefined
      if (updates.startTime) {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
        const currentStart = new Date(targetEvent.start.dateTime)
        const [h, m] = updates.startTime.split(':').map(Number)
        currentStart.setHours(h, m, 0)
        const duration = updates.duration || (targetEvent.end?.dateTime && targetEvent.start?.dateTime ? Math.round((new Date(targetEvent.end.dateTime) - new Date(targetEvent.start.dateTime)) / 60000) : 60)
        const endTime = new Date(currentStart.getTime() + duration * 60000)
        targetEvent.start = { dateTime: currentStart.toISOString(), timeZone: tz }
        targetEvent.end = { dateTime: endTime.toISOString(), timeZone: tz }
      }
      const r = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId)}/events/${targetId}`, {
        method: 'PUT', headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify(targetEvent) })
      if (r.ok) { await refreshCurrentView(); return { success: true } }
      return { success: false }
    } catch (e) { return { success: false } }
  }

  const updateEventById = async (eventId, calId, updates) => {
    try {
      const getR = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId)}/events/${eventId}`, { headers: { Authorization: `Bearer ${accessToken}` } })
      if (!getR.ok) return { success: false }
      const event = await getR.json()
      if (updates.summary) event.summary = updates.summary
      if (updates.description !== undefined) event.description = updates.description
      if (updates.location !== undefined) event.location = updates.location
      if (updates.colorId !== undefined) event.colorId = updates.colorId ? String(updates.colorId) : undefined
      if (updates.date || updates.startTime) {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
        const existingStart = event.start?.dateTime ? new Date(event.start.dateTime) : null
        const existingEnd = event.end?.dateTime ? new Date(event.end.dateTime) : null
        const existingTime = existingStart ? `${String(existingStart.getHours()).padStart(2,'0')}:${String(existingStart.getMinutes()).padStart(2,'0')}` : '09:00'
        const existingDate = existingStart ? getDateString(existingStart) : getDateString(new Date())
        const startTime = updates.startTime || existingTime
        const date = updates.date || existingDate
        const duration = updates.duration || (existingStart && existingEnd ? Math.round((existingEnd - existingStart) / 60000) : 60)
        const addMinutes = (t, m) => { const [h, min] = t.split(':').map(Number); const total = h * 60 + min + m; return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}` }
        event.start = { dateTime: `${date}T${startTime}:00`, timeZone: tz }
        event.end = { dateTime: `${date}T${addMinutes(startTime, duration)}:00`, timeZone: tz }
      }
      const r = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId)}/events/${eventId}`, {
        method: 'PUT', headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify(event) })
      if (r.ok) { await refreshCurrentView(); if (calendarList.length) { const monthEvents = await fetchEventsForMonth(accessToken, calendarViewDate, calendarList); setAllEvents(monthEvents) } return { success: true, event: await r.json() } }
      return { success: false }
    } catch (e) { return { success: false } }
  }

  const findEventByFuzzyMatch = async (searchText, targetDate = null) => {
    const search = searchText.toLowerCase()
    const words = search.split(/\s+/).filter(w => w.length > 1)
    let eventsToSearch = []
    if (targetDate && accessToken && calendarList.length) eventsToSearch = await fetchEventsForDate(accessToken, targetDate, calendarList)
    else if (accessToken && calendarList.length) {
      const start = new Date(); start.setDate(start.getDate() - 7)
      const end = new Date(); end.setDate(end.getDate() + 30)
      eventsToSearch = await fetchEventsFromAllCalendars(accessToken, start, end, calendarList)
    }
    eventsToSearch = eventsToSearch.filter(e => e.summary && !isCanvasAllDayEvent(e) && !isHolidayEvent(e))
    let event = eventsToSearch.find(e => e.summary.toLowerCase() === search)
    if (event) return { event, confidence: 'exact' }
    event = eventsToSearch.find(e => e.summary.toLowerCase().includes(search))
    if (event) return { event, confidence: 'high' }
    event = eventsToSearch.find(e => search.includes(e.summary.toLowerCase()))
    if (event) return { event, confidence: 'high' }
    const levenshtein = (a, b) => {
      const m = a.length, n = b.length
      const dp = Array.from({ length: m + 1 }, (_, i) => Array.from({ length: n + 1 }, (_, j) => i || j))
      for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++)
        dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1])
      return dp[m][n]
    }
    const wordSimilar = (w1, w2) => {
      if (w1.includes(w2) || w2.includes(w1)) return true
      const maxLen = Math.max(w1.length, w2.length)
      if (maxLen <= 2) return w1 === w2
      return levenshtein(w1, w2) / maxLen <= 0.3
    }
    const matches = eventsToSearch.map(e => {
      const titleWords = e.summary.toLowerCase().split(/\s+/)
      const overlap = words.filter(w => titleWords.some(tw => wordSimilar(w, tw)))
      return { event: e, score: overlap.length / Math.max(words.length, titleWords.length) }
    }).filter(m => m.score > 0.3).sort((a, b) => b.score - a.score)
    if (matches.length === 1 && matches[0].score > 0.5) return { event: matches[0].event, confidence: 'high' }
    if (matches.length === 1) return { event: matches[0].event, confidence: 'medium' }
    if (matches.length > 1 && matches[0].score > matches[1].score + 0.2) return { event: matches[0].event, confidence: 'high' }
    if (matches.length > 1) return { event: null, confidence: 'ambiguous', candidates: matches.slice(0, 3).map(m => m.event.summary) }
    return { event: null, confidence: 'none' }
  }

  const getScheduleForDate = async (dateStr) => {
    if (!accessToken || !calendarList.length) return { events: [], message: 'Please connect your Google Calendar first.' }
    const [y, m, d] = dateStr.split('-').map(Number)
    const targetDate = new Date(y, m - 1, d)
    const events = await fetchEventsForDate(accessToken, targetDate, calendarList)
    const filteredEvents = events.filter(e => !isHolidayEvent(e))
    if (filteredEvents.length === 0) return { events: [], message: `You have no events scheduled for ${formatDate(targetDate)}.` }
    const eventList = filteredEvents.map(e => {
      const timeStr = e.start.dateTime ? `${new Date(e.start.dateTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })} - ${new Date(e.end.dateTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}` : 'All day'
      const locationStr = e.location ? ` at ${e.location}` : ''
      return `- ${e.summary} (${timeStr})${locationStr}`
    }).join('\n')
    return { events: filteredEvents, message: `Here's your schedule for ${formatDate(targetDate)}:\n\n${eventList}` }
  }

  const getWeekSchedule = async (startDateStr) => {
    if (!accessToken || !calendarList.length) return { events: [], message: 'Please connect your Google Calendar first.' }
    const [y, m, d] = startDateStr.split('-').map(Number)
    const startDate = new Date(y, m - 1, d)
    const endDate = new Date(startDate); endDate.setDate(endDate.getDate() + 7)
    const events = await fetchEventsFromAllCalendars(accessToken, startDate, endDate, calendarList)
    const filteredEvents = events.filter(e => !isHolidayEvent(e))
    if (filteredEvents.length === 0) return { events: [], message: `You have no events scheduled for the week starting ${formatDate(startDate)}.` }
    const eventsByDay = {}
    filteredEvents.forEach(e => {
      const eventDate = getEventDate(e)
      const dayKey = getDateString(eventDate)
      if (!eventsByDay[dayKey]) eventsByDay[dayKey] = []
      eventsByDay[dayKey].push(e)
    })
    let message = `Here's your week starting ${formatDate(startDate)}:\n`
    Object.keys(eventsByDay).sort().forEach(dayKey => {
      const [dy, dm, dd] = dayKey.split('-').map(Number)
      const dayDate = new Date(dy, dm - 1, dd)
      const dayName = dayDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
      message += `\n**${dayName}:**\n`
      eventsByDay[dayKey].forEach(e => {
        const timeStr = e.start.dateTime ? `${new Date(e.start.dateTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}` : 'All day'
        message += `  - ${e.summary} (${timeStr})\n`
      })
    })
    return { events: filteredEvents, message }
  }

  const checkAvailabilityAtTime = async (dateStr, timeStr, durationMins = 60) => {
    if (!accessToken || !calendarList.length) return { isFree: false, message: 'Please connect your Google Calendar first.' }
    const [y, m, d] = dateStr.split('-').map(Number)
    const [h, min] = timeStr.split(':').map(Number)
    const checkStart = new Date(y, m - 1, d, h, min)
    const checkEnd = new Date(checkStart.getTime() + durationMins * 60000)
    const targetDate = new Date(y, m - 1, d)
    const events = await fetchEventsForDate(accessToken, targetDate, calendarList)
    const filteredEvents = events.filter(e => !isHolidayEvent(e) && e.start.dateTime)
    const conflicts = filteredEvents.filter(e => {
      const eventStart = new Date(e.start.dateTime)
      const eventEnd = new Date(e.end.dateTime)
      return eventStart < checkEnd && eventEnd > checkStart
    })
    const timeFormatted = checkStart.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })
    const dateFormatted = formatDate(targetDate)
    if (conflicts.length === 0) return { isFree: true, message: `Yes, you're free at ${timeFormatted} on ${dateFormatted}. You have ${formatDuration(durationMins)} available.`, conflicts: [] }
    const conflictList = conflicts.map(e => {
      const start = new Date(e.start.dateTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })
      const end = new Date(e.end.dateTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })
      return `${e.summary} (${start} - ${end})`
    }).join(', ')
    return { isFree: false, message: `No, you're not free at ${timeFormatted} on ${dateFormatted}. You have: ${conflictList}`, conflicts }
  }

  const findFreeTimeSlots = async (dateStr, minDurationMins = 30) => {
    if (!accessToken || !calendarList.length) return { slots: [], message: 'Please connect your Google Calendar first.' }
    const [y, m, d] = dateStr.split('-').map(Number)
    const targetDate = new Date(y, m - 1, d)
    const dayStart = new Date(y, m - 1, d, 9, 0)
    const dayEnd = new Date(y, m - 1, d, 18, 0)
    const now = new Date()
    let searchStart = dayStart
    if (isSameDay(targetDate, now) && now > dayStart) {
      const mins = now.getMinutes()
      const roundedMins = Math.ceil(mins / 30) * 30
      searchStart = new Date(now)
      searchStart.setMinutes(roundedMins, 0, 0)
      if (roundedMins >= 60) { searchStart.setHours(searchStart.getHours() + 1); searchStart.setMinutes(0) }
    }
    const events = await fetchEventsForDate(accessToken, targetDate, calendarList)
    const timedEvents = events.filter(e => !isHolidayEvent(e) && e.start.dateTime).map(e => ({ start: new Date(e.start.dateTime), end: new Date(e.end.dateTime), summary: e.summary })).sort((a, b) => a.start - b.start)
    const freeSlots = []
    let currentTime = searchStart
    for (const event of timedEvents) {
      if (event.start > currentTime && event.start <= dayEnd) {
        const gapMinutes = Math.round((event.start - currentTime) / 60000)
        if (gapMinutes >= minDurationMins) freeSlots.push({ start: new Date(currentTime), end: new Date(event.start), duration: gapMinutes })
      }
      if (event.end > currentTime) currentTime = new Date(event.end)
    }
    if (currentTime < dayEnd) {
      const gapMinutes = Math.round((dayEnd - currentTime) / 60000)
      if (gapMinutes >= minDurationMins) freeSlots.push({ start: new Date(currentTime), end: new Date(dayEnd), duration: gapMinutes })
    }
    const dateFormatted = formatDate(targetDate)
    if (freeSlots.length === 0) return { slots: [], message: `You don't have any free time slots of ${formatDuration(minDurationMins)}+ on ${dateFormatted} (between 9 AM and 6 PM).` }
    const slotList = freeSlots.map(slot => {
      const startStr = slot.start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })
      const endStr = slot.end.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })
      return `- ${startStr} - ${endStr} (${formatDuration(slot.duration)})`
    }).join('\n')
    return { slots: freeSlots, message: `Here are your free time slots on ${dateFormatted}:\n\n${slotList}` }
  }

  const deleteEventsInRange = async (startDateStr) => {
    const [sy, sm, sd] = startDateStr.split('-').map(Number)
    const targetDate = new Date(sy, sm - 1, sd)
    const eventsToDelete = await fetchEventsForDate(accessToken, targetDate, calendarList)
    const deletableEvents = eventsToDelete.filter(e => !isCanvasAllDayEvent(e) && !isHolidayEvent(e) && !isCanvasEvent(e))
    if (!deletableEvents.length) return { deleted: 0, events: [] }
    const deletedEvents = []
    for (const e of deletableEvents) {
      try {
        const r = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(e.calendarId)}/events/${e.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` } })
        if (r.ok || r.status === 204) deletedEvents.push(e.summary)
      } catch (err) {}
    }
    await refreshCurrentView()
    return { deleted: deletedEvents.length, events: deletedEvents }
  }

  const getHolidaysForDate = (date) => allEvents.filter(e => isHolidayEvent(e) && eventIsOnDate(e, date)).map(e => e.summary)

  const initialize = async (token) => {
    const calendars = await fetchCalendarList(token)
    if (!calendars.length) return { calendars: [], taskListId: null }
    setCalendarList(calendars)
    return { calendars }
  }

  const loadEvents = async (token, calendars, date) => {
    const monthEvents = await fetchEventsForMonth(token, date || new Date(), calendars)
    setAllEvents(monthEvents)
    const events = await fetchEventsForDate(token, selectedDate, calendars)
    setCalendarEvents(events.filter(e => !isHolidayEvent(e) && !isCanvasAllDayEvent(e)))
    return monthEvents
  }

  // Refresh when selectedDate changes
  useEffect(() => {
    if (accessToken && calendarList.length) refreshCurrentView()
  }, [selectedDate, accessToken, calendarList.length])

  // Refresh month events when calendarViewDate changes
  useEffect(() => {
    const fetchMonthEvents = async () => {
      if (accessToken && calendarList.length) {
        const events = await fetchEventsForMonth(accessToken, calendarViewDate, calendarList)
        setAllEvents(events)
      }
    }
    fetchMonthEvents()
  }, [calendarViewDate, accessToken, calendarList.length])

  return (
    <CalendarContext.Provider value={{
      calendarEvents, setCalendarEvents, allEvents, setAllEvents,
      calendarList, setCalendarList, selectedDate, setSelectedDate,
      calendarViewDate, setCalendarViewDate, selectedCalendarDay, setSelectedCalendarDay,
      primaryCalendarId,
      fetchCalendarList, fetchEventsFromAllCalendars, fetchEventsForDate, fetchEventsForMonth,
      refreshCurrentView, createEvent, deleteEventById, checkForConflicts,
      createRecurringEvent, deleteRecurringEvent, editRecurringEvent,
      updateEventById, findEventByFuzzyMatch,
      getScheduleForDate, getWeekSchedule, checkAvailabilityAtTime, findFreeTimeSlots,
      deleteEventsInRange, getHolidaysForDate,
      initialize, loadEvents
    }}>
      {children}
    </CalendarContext.Provider>
  )
}

export function useCalendar() {
  const ctx = useContext(CalendarContext)
  if (!ctx) throw new Error('useCalendar must be used within CalendarProvider')
  return ctx
}
