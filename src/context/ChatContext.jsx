import { createContext, useContext, useState, useRef, useEffect } from 'react'
import { useAuth } from './AuthContext'
import { useCalendar, formatDate, formatTime12h, formatDuration, getDateString, parseLocalDate, parseTaskDueDate, isSameDay, isRecurringEvent, getEventDate, isHolidayEvent, isCanvasEvent, eventIsOnDate } from './CalendarContext'
import { useTasks, parseTaskNotes, getTaskUrgencyColor, buildTaskNotes, taskIsOnDate } from './TaskContext'
import { useWeather } from './WeatherContext'
import { useSettings } from './SettingsContext'

const ChatContext = createContext()

const isConfirmationResponse = (text) => {
  const lower = text.toLowerCase().trim()
  if (lower.length > 20) return false
  return /^(yes|yeah|yep|yup|correct|right|sure|ok|okay|do it|go ahead|please|confirm|y)$/i.test(lower)
}

const isNegativeResponse = (text) => {
  const lower = text.toLowerCase().trim()
  if (lower.length > 20) return false
  return /^(no|nope|nah|cancel|stop|don't|nevermind|never mind|n)$/i.test(lower)
}

export function ChatProvider({ children }) {
  const { accessToken } = useAuth()
  const {
    calendarList, allEvents, fetchEventsFromAllCalendars, fetchEventsForDate,
    createEvent, deleteEventById, createRecurringEvent, deleteRecurringEvent,
    editRecurringEvent, updateEventById, findEventByFuzzyMatch,
    getScheduleForDate, getWeekSchedule, checkAvailabilityAtTime, findFreeTimeSlots,
    deleteEventsInRange, getHolidaysForDate, refreshCurrentView
  } = useCalendar()
  const {
    googleTasks, addGoogleTask, updateGoogleTask, completeTask, uncompleteTask,
    deleteGoogleTask, bulkDeleteTasks, deleteDuplicateTasks,
    findTaskByFuzzyMatch, queryTasks
  } = useTasks()
  const { weather, userLocation, fetchWeatherForLocation } = useWeather()
  const { getApiKey, behavioralRules, addBehavioralRule } = useSettings()

  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [conversationHistory, setConversationHistory] = useState([])
  const [pendingAction, setPendingAction] = useState(null)
  const [statusMessage, setStatusMessage] = useState('')
  const [lastMentioned, setLastMentioned] = useState(null) // { type: 'event'|'task', name: '...', date: '...' }

  const chatEndRef = useRef(null)

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [chatMessages])

  const getDateMappingContext = () => {
    const today = new Date()
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    let mapping = '\n\n=== DATE LOOKUP TABLE (use these exact dates) ===\n'
    mapping += `TODAY: ${days[today.getDay()]} = ${getDateString(today)}\n`
    for (let i = 1; i <= 7; i++) {
      const d = new Date(today); d.setDate(d.getDate() + i)
      const dayName = days[d.getDay()]
      const dateStr = getDateString(d)
      if (i === 1) mapping += `TOMORROW: ${dayName} = ${dateStr}\n`
      else mapping += `${dayName} = ${dateStr}\n`
    }
    mapping += '=== Copy dates exactly from above, do not calculate ===\n'
    return mapping
  }

  const buildSystemPrompt = () => {
    const today = new Date()
    const todayStr = getDateString(today)
    const holidays = getHolidaysForDate(today)
    const incompleteTasks = googleTasks.filter(t => t.status !== 'completed')
    let taskList = incompleteTasks.length ? "\n\nCurrent Tasks:\n" + incompleteTasks.slice(0, 10).map(t => {
      const { priority } = parseTaskNotes(t.notes); return `- [${priority.toUpperCase()}] ${t.title}`
    }).join('\n') : "\n\nNo pending tasks."
    const rulesSection = behavioralRules.length > 0 ? '\n\nUSER RULES (follow these):\n' + behavioralRules.map((r, i) => `${i + 1}. ${r.rule}`).join('\n') : ''
    const holidayNote = holidays.length ? `\n\nToday's holidays: ${holidays.join(', ')}` : ''
    const dateMapping = getDateMappingContext()
    const getGreeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening' }

    const lastCtx = lastMentioned ? `\nLast mentioned: ${lastMentioned.type} "${lastMentioned.name}"${lastMentioned.date ? ` on ${lastMentioned.date}` : ''}` : ''

    return `You are Nova, a personal secretary. You manage calendar events, tasks, weather, and behavioral rules. Be concise and friendly.
${dateMapping}
DATES: Use EXACT dates from the table above. Never calculate dates yourself.
Today: ${formatDate(today)} (${todayStr}). Time: ${today.toLocaleTimeString()}.${holidayNote}${taskList}${rulesSection}${lastCtx}
Location: ${userLocation}. Weather: ${weather ? `${Math.round(weather.main.temp)}°F, ${weather.weather[0].description}` : 'unavailable'}

RULES:
1. ALWAYS respond with valid JSON only (no markdown, no backticks, no explanation text).
2. Event names are user-created and can be ANYTHING ("worm meeting", "pizza night", etc.). If the user mentions moving, scheduling, deleting, or editing something — it IS a calendar/task action.
3. If user says "it", "that", "the meeting" etc., refer to the "Last mentioned" item above.
4. For MULTIPLE actions in one message, return: {"actions":[...array of action objects...],"response":"summary"}
5. Only use out_of_scope for truly unrelated requests like trivia, jokes, or essays.
6. Times 1-5 without AM/PM = assume PM. Times 6-11 without AM/PM = ask.
7. "push back 1 hour" / "move it later by 30 min" = use reschedule_event with timeShift.
8. Set expectsResponse:true when asking the user a question.

ACTIONS (respond with ONE of these, or an array via "actions"):

=== EVENTS ===
Create: {"action":"create_event","title":"...","date":"YYYY-MM-DD","startTime":"HH:MM","duration":60,"location":"...","description":"...","response":"..."}
Delete: {"action":"delete_event","eventTitle":"...","date":"YYYY-MM-DD","response":"..."}
Reschedule: {"action":"reschedule_event","eventTitle":"...","date":"YYYY-MM-DD","newDate":"YYYY-MM-DD or null","newStartTime":"HH:MM or null","newDuration":null,"timeShift":null,"response":"..."}
  - "date" = current date (to find it). "newDate" = target date. newStartTime = null keeps existing time.
  - timeShift: minutes to shift (e.g. +60 = 1hr later, -30 = 30min earlier). Use for "push back", "move later/earlier".
Update: {"action":"update_event","eventTitle":"...","date":"YYYY-MM-DD","updates":{"title":"...","location":"...","description":"..."},"response":"..."}
Clear day: {"action":"clear_day","date":"YYYY-MM-DD","confirm":false,"response":"...","expectsResponse":true}

=== RECURRING EVENTS ===
Create: {"action":"create_recurring_event","title":"...","date":"YYYY-MM-DD","startTime":"HH:MM","duration":60,"recurrence":{"frequency":"daily|weekly|monthly","interval":1,"daysOfWeek":["MO","TU"],"until":"YYYY-MM-DD or null"},"response":"..."}
Edit: {"action":"edit_recurring_event","eventTitle":"...","date":"YYYY-MM-DD","editScope":"single|all","updates":{...},"response":"..."}
Delete: {"action":"delete_recurring_event","eventTitle":"...","date":"YYYY-MM-DD","deleteScope":"single|all","response":"..."}
Ask scope: {"action":"ask_recurring_scope","eventTitle":"...","date":"YYYY-MM-DD","operation":"edit|delete","updates":{...},"response":"...","expectsResponse":true}

=== TASKS ===
Add: {"action":"add_task","title":"...","type":"general|due","dueDate":"YYYY-MM-DD or null","description":"...","response":"..."}
Edit: {"action":"edit_task","taskTitle":"...","updates":{"title":"...","dueDate":"...","description":"...","type":"general|due"},"response":"..."}
Complete: {"action":"complete_task","taskTitle":"...","response":"..."}
Uncomplete: {"action":"uncomplete_task","taskTitle":"...","response":"..."}
Delete: {"action":"delete_task","taskTitle":"...","response":"..."}
Bulk delete: {"action":"bulk_delete_tasks","filter":"completed|overdue|all","response":"..."}
Delete dupes: {"action":"delete_duplicate_tasks","response":"..."}
Query: {"action":"query_tasks","filter":"all|general|due|overdue|today|completed","response":"..."}
Ask type: {"action":"ask_task_type","title":"...","description":"...","response":"...","expectsResponse":true}

=== QUERIES ===
Day schedule: {"action":"check_schedule","date":"YYYY-MM-DD","response":"..."}
Week schedule: {"action":"check_week_schedule","date":"YYYY-MM-DD","response":"..."}
Availability: {"action":"check_availability","date":"YYYY-MM-DD","time":"HH:MM","duration":60,"response":"..."}
Free time: {"action":"find_free_time","date":"YYYY-MM-DD","duration":60,"response":"..."}

=== ASK FOR INFO ===
Missing info: {"action":"ask_missing_info","eventDetails":{"title":"...","date":null,"startTime":null,"duration":null},"missing":["date","time","duration"],"response":"...","expectsResponse":true}
Ask time: {"action":"ask_time","eventDetails":{...},"response":"...","expectsResponse":true}
Ask AM/PM: {"action":"ask_ampm","time":"9:00","eventDetails":{...},"response":"...","expectsResponse":true}
Ask duration: {"action":"ask_duration","eventDetails":{...},"response":"...","expectsResponse":true}
Ask event name: {"action":"ask_event_name","partialDetails":{...},"response":"...","expectsResponse":true}

=== OTHER ===
Weather: {"action":"get_weather","location":"city or current","response":"..."}
Add rule: {"action":"add_rule","rule":"...","response":"..."}
Out of scope: {"action":"out_of_scope","response":"..."}

EXAMPLES:
User: "Move my dentist appointment to Friday and cancel yoga"
→ {"actions":[{"action":"reschedule_event","eventTitle":"dentist appointment","newDate":"2026-02-20","newStartTime":null,"response":"Moved dentist to Friday."},{"action":"delete_event","eventTitle":"yoga","response":"Cancelled yoga."}],"response":"Done! Moved your dentist appointment to Friday and cancelled yoga."}

User: "Push my meeting back an hour"
→ {"action":"reschedule_event","eventTitle":"meeting","timeShift":60,"response":"Pushed your meeting back by 1 hour."}

User: "Add buy groceries and finish report by Friday"
→ {"actions":[{"action":"ask_task_type","title":"buy groceries","response":"","expectsResponse":true},{"action":"add_task","title":"finish report","type":"due","dueDate":"2026-02-20","response":""}],"response":"Added 'finish report' due Friday. Does 'buy groceries' have a due date, or is it a general task?"}

User: "Schedule Seattle worm meeting Saturday at 3pm for 2 hours"
→ {"action":"create_event","title":"Seattle worm meeting","date":"2026-02-21","startTime":"15:00","duration":120,"response":"Scheduled 'Seattle worm meeting' on Saturday at 3:00 PM for 2 hours."}`
  }

  const processCommand = async (inputText) => {
    const currentApiKey = getApiKey()
    if (!currentApiKey) return { success: false, message: 'Please add your Anthropic API key in Settings.', expectsResponse: false }

    // Handle pending task type response
    if (pendingAction?.type === 'task_type') {
      const lower = inputText.toLowerCase().trim()
      if (lower.includes('general') || lower.includes('no due') || lower.includes('no deadline') || lower.includes('eventually')) {
        const r = await addGoogleTask(pendingAction.details.title, null, 'general', pendingAction.details.description)
        setPendingAction(null)
        return { success: r.success, message: r.success ? `Added general task "${pendingAction.details.title}".` : 'Failed to add task.', expectsResponse: false }
      } else if (lower.includes('due') || lower.includes('deadline')) {
        setPendingAction({ type: 'task_due_date', details: pendingAction.details })
        return { success: true, message: 'When is it due?', expectsResponse: true }
      }
      const dateMatch = inputText.match(/(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?|(\w+day)|tomorrow|today/i)
      if (dateMatch) {
        let dueDate = null
        if (dateMatch[0].toLowerCase() === 'today') dueDate = getDateString(new Date())
        else if (dateMatch[0].toLowerCase() === 'tomorrow') { const d = new Date(); d.setDate(d.getDate() + 1); dueDate = getDateString(d) }
        else if (dateMatch[4]) {
          const days = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday']
          const targetDay = days.indexOf(dateMatch[4].toLowerCase())
          if (targetDay >= 0) { const d = new Date(); const currentDay = d.getDay(); const daysToAdd = (targetDay - currentDay + 7) % 7 || 7; d.setDate(d.getDate() + daysToAdd); dueDate = getDateString(d) }
        } else {
          const month = parseInt(dateMatch[1]); const day = parseInt(dateMatch[2])
          const year = dateMatch[3] ? (dateMatch[3].length === 2 ? 2000 + parseInt(dateMatch[3]) : parseInt(dateMatch[3])) : new Date().getFullYear()
          dueDate = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`
        }
        const r = await addGoogleTask(pendingAction.details.title, dueDate, 'due', pendingAction.details.description)
        setPendingAction(null)
        return { success: r.success, message: r.success ? `Added "${pendingAction.details.title}" due ${parseLocalDate(dueDate).toLocaleDateString()}.` : 'Failed to add task.', expectsResponse: false }
      }
      return { success: true, message: 'Please specify "general" for no due date, or tell me when it\'s due.', expectsResponse: true }
    }

    if (pendingAction?.type === 'task_due_date') {
      const dateMatch = inputText.match(/(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?|(\w+day)|tomorrow|today/i)
      if (dateMatch) {
        let dueDate = null
        if (dateMatch[0].toLowerCase() === 'today') dueDate = getDateString(new Date())
        else if (dateMatch[0].toLowerCase() === 'tomorrow') { const d = new Date(); d.setDate(d.getDate() + 1); dueDate = getDateString(d) }
        else if (dateMatch[4]) {
          const days = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday']
          const targetDay = days.indexOf(dateMatch[4].toLowerCase())
          if (targetDay >= 0) { const d = new Date(); const currentDay = d.getDay(); const daysToAdd = (targetDay - currentDay + 7) % 7 || 7; d.setDate(d.getDate() + daysToAdd); dueDate = getDateString(d) }
        } else {
          const month = parseInt(dateMatch[1]); const day = parseInt(dateMatch[2])
          const year = dateMatch[3] ? (dateMatch[3].length === 2 ? 2000 + parseInt(dateMatch[3]) : parseInt(dateMatch[3])) : new Date().getFullYear()
          dueDate = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`
        }
        const r = await addGoogleTask(pendingAction.details.title, dueDate, 'due', pendingAction.details.description)
        setPendingAction(null)
        return { success: r.success, message: r.success ? `Added "${pendingAction.details.title}" due ${parseLocalDate(dueDate).toLocaleDateString()}.` : 'Failed to add task.', expectsResponse: false }
      }
      return { success: true, message: 'Please specify a date (e.g., "Friday", "1/19", "tomorrow").', expectsResponse: true }
    }

    if (pendingAction?.type === 'confirm_bulk_delete') {
      if (isConfirmationResponse(inputText)) {
        const r = await bulkDeleteTasks(googleTasks.map(t => t.id))
        setPendingAction(null)
        return { success: r.success, message: r.success ? `Deleted all ${r.deleted} tasks.` : 'Could not delete tasks.', expectsResponse: false }
      }
      if (isNegativeResponse(inputText)) { setPendingAction(null); return { success: true, message: 'Bulk delete cancelled.', expectsResponse: false } }
      return { success: true, message: 'Please reply yes or no.', expectsResponse: true }
    }

    if (pendingAction?.type === 'time') {
      const timeMatch = inputText.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i)
      if (timeMatch) {
        let h = parseInt(timeMatch[1]); const m = timeMatch[2] ? parseInt(timeMatch[2]) : 0; const period = timeMatch[3]?.toLowerCase()
        if (period === 'pm' && h < 12) h += 12
        if (period === 'am' && h === 12) h = 0
        if (!period && h >= 1 && h <= 5) h += 12
        if (!period && h >= 6 && h <= 11) {
          setPendingAction({ type: 'ampm', time: `${h}:${String(m).padStart(2, '0')}`, details: { ...pendingAction.details } })
          return { success: true, message: `Is that ${h} AM or ${h} PM?`, expectsResponse: true }
        }
        const time24 = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
        const r = await createEvent({ ...pendingAction.details, startTime: time24 })
        setPendingAction(null)
        return { success: r.success, message: r.success ? `Scheduled ${pendingAction.details.title} at ${formatTime12h(time24)}.` : 'Could not create event.', expectsResponse: false }
      }
      return { success: true, message: 'Please provide a time (e.g., "2pm", "14:00").', expectsResponse: true }
    }

    if (pendingAction?.type === 'ampm') {
      if (inputText.toLowerCase().includes('am') || inputText.toLowerCase().includes('pm')) {
        const isPM = inputText.toLowerCase().includes('pm')
        let [h, m] = pendingAction.time.split(':').map(Number)
        if (isPM && h < 12) h += 12
        if (!isPM && h === 12) h = 0
        const time24 = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
        const eventData = { ...pendingAction.details, startTime: time24 }
        const r = await createEvent(eventData)
        setPendingAction(null)
        return { success: r.success, message: r.success ? `Scheduled ${pendingAction.details.title} at ${formatTime12h(time24)}.` : 'Could not create event.', expectsResponse: false }
      }
      return { success: true, message: 'Please specify AM or PM.', expectsResponse: true }
    }

    if (pendingAction?.type === 'confirm_task') {
      if (isConfirmationResponse(inputText)) {
        let r, msg
        if (pendingAction.operation === 'complete') { r = await completeTask(pendingAction.task.id); msg = `Completed "${pendingAction.task.title}".` }
        else if (pendingAction.operation === 'delete') { r = await deleteGoogleTask(pendingAction.task.id); msg = `Deleted "${pendingAction.task.title}".` }
        else if (pendingAction.operation === 'edit') { r = await updateGoogleTask(pendingAction.task.id, pendingAction.updates); msg = `Updated "${pendingAction.task.title}".` }
        setPendingAction(null)
        return { success: r.success, message: msg, expectsResponse: false }
      }
      if (isNegativeResponse(inputText)) { setPendingAction(null); return { success: true, message: 'Cancelled.', expectsResponse: false } }
      return { success: true, message: 'Please reply yes or no.', expectsResponse: true }
    }

    if (pendingAction?.type === 'confirm_event') {
      if (isConfirmationResponse(inputText)) {
        if (pendingAction.operation === 'delete') { await deleteEventById(pendingAction.event.id, pendingAction.event.calendarId); setPendingAction(null); return { success: true, message: `Deleted "${pendingAction.event.summary}".`, expectsResponse: false } }
        if (pendingAction.operation === 'reschedule') {
          let newStartTime = pendingAction.newStartTime || null
          if (pendingAction.timeShift && pendingAction.event.start?.dateTime) {
            const existingStart = new Date(pendingAction.event.start.dateTime)
            existingStart.setMinutes(existingStart.getMinutes() + pendingAction.timeShift)
            newStartTime = `${String(existingStart.getHours()).padStart(2,'0')}:${String(existingStart.getMinutes()).padStart(2,'0')}`
          }
          const newDate = pendingAction.newDate || pendingAction.date || getDateString(getEventDate(pendingAction.event))
          const r = await updateEventById(pendingAction.event.id, pendingAction.event.calendarId, { startTime: newStartTime, date: newDate, duration: pendingAction.newDuration })
          setPendingAction(null)
          if (r.success) {
            let msg = `Rescheduled "${pendingAction.event.summary}"`
            if (pendingAction.newStartTime) msg += ` to ${formatTime12h(pendingAction.newStartTime)}`
            if (newDate) msg += ` on ${formatDate(parseLocalDate(newDate))}`
            return { success: true, message: msg + '.', expectsResponse: false }
          }
          return { success: false, message: 'Could not reschedule the event.', expectsResponse: false }
        }
        if (pendingAction.operation === 'update') {
          const updates = {}
          if (pendingAction.updates?.title) updates.summary = pendingAction.updates.title
          if (pendingAction.updates?.location !== undefined) updates.location = pendingAction.updates.location
          if (pendingAction.updates?.description !== undefined) updates.description = pendingAction.updates.description
          const r = await updateEventById(pendingAction.event.id, pendingAction.event.calendarId, updates)
          setPendingAction(null)
          if (r.success) return { success: true, message: `Updated "${pendingAction.event.summary}".`, expectsResponse: false }
          return { success: false, message: 'Could not update the event.', expectsResponse: false }
        }
      }
      if (isNegativeResponse(inputText)) { setPendingAction(null); return { success: true, message: 'Cancelled.', expectsResponse: false } }
      return { success: true, message: 'Please reply yes or no.', expectsResponse: true }
    }

    if (pendingAction?.type === 'confirm_conflict') {
      if (isConfirmationResponse(inputText)) {
        const r = await createEvent(pendingAction.eventData, true)
        setPendingAction(null)
        if (r.success) {
          let response = `Scheduled "${pendingAction.eventData.title}" at ${formatTime12h(pendingAction.eventData.startTime)}`
          if (pendingAction.eventData.location) response += ` at ${pendingAction.eventData.location}`
          response += ' (despite the conflict).'
          return { success: true, message: response, expectsResponse: false }
        }
        return { success: false, message: 'Could not create event.', expectsResponse: false }
      }
      if (isNegativeResponse(inputText)) { setPendingAction(null); return { success: true, message: 'Event not created.', expectsResponse: false } }
      return { success: true, message: 'Please reply yes or no.', expectsResponse: true }
    }

    if (pendingAction?.type === 'duration') {
      const durationMatch = inputText.match(/(\d+)\s*(hour|hr|minute|min|m)?s?/i)
      if (durationMatch) {
        let duration = parseInt(durationMatch[1])
        const unit = durationMatch[2]?.toLowerCase()
        if (unit && (unit.startsWith('hour') || unit === 'hr')) duration = duration * 60
        else if (!unit && duration <= 4) duration = duration * 60
        const eventData = { ...pendingAction.details, duration }
        const r = await createEvent(eventData)
        setPendingAction(null)
        if (r.hasConflict) {
          const conflictNames = r.conflicts.map(c => c.summary).join(', ')
          setPendingAction({ type: 'confirm_conflict', eventData })
          return { success: true, message: `This conflicts with: ${conflictNames}. Schedule anyway?`, expectsResponse: true }
        }
        if (r.success) {
          let response = `Scheduled "${eventData.title}" for ${formatDuration(duration)} at ${formatTime12h(eventData.startTime)}`
          if (eventData.location) response += ` at ${eventData.location}`
          return { success: true, message: response + '.', expectsResponse: false }
        }
        return { success: false, message: 'Could not create event.', expectsResponse: false }
      }
      return { success: true, message: 'Please specify a duration like "1 hour" or "30 minutes".', expectsResponse: true }
    }

    if (pendingAction?.type === 'confirm_clear_day') {
      if (isConfirmationResponse(inputText)) {
        const r = await deleteEventsInRange(pendingAction.date)
        setPendingAction(null)
        return { success: true, message: r.deleted > 0 ? `Cleared ${r.deleted} event${r.deleted > 1 ? 's' : ''}: ${r.events.join(', ')}.` : 'No events to clear.', expectsResponse: false }
      }
      if (isNegativeResponse(inputText)) { setPendingAction(null); return { success: true, message: 'Schedule not cleared.', expectsResponse: false } }
      return { success: true, message: 'Please reply yes or no.', expectsResponse: true }
    }

    if (pendingAction?.type === 'recurring_end_date') {
      const lower = inputText.toLowerCase()
      let untilDate = null
      if (lower.includes('indefinite') || lower.includes('forever') || lower.includes('no end')) untilDate = null
      else {
        const dateMatch = inputText.match(/(\d{4}-\d{2}-\d{2})|(\w+\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s+\d{4})?)/i)
        if (dateMatch) { const parsed = new Date(dateMatch[0]); if (!isNaN(parsed)) untilDate = getDateString(parsed) }
        if (lower.includes('month')) { const d = new Date(); d.setMonth(d.getMonth() + (parseInt(inputText) || 1)); untilDate = getDateString(d) }
        else if (lower.includes('year')) { const d = new Date(); d.setFullYear(d.getFullYear() + (parseInt(inputText) || 1)); untilDate = getDateString(d) }
        else if (lower.includes('end of semester') || lower.includes('end of term')) {
          const d = new Date()
          if (d.getMonth() < 5) d.setMonth(4, 15)
          else if (d.getMonth() < 11) d.setMonth(11, 15)
          else { d.setFullYear(d.getFullYear() + 1); d.setMonth(4, 15) }
          untilDate = getDateString(d)
        }
      }
      const eventData = { ...pendingAction.eventData }
      if (untilDate) eventData.recurrence.until = untilDate
      const r = await createRecurringEvent(eventData)
      setPendingAction(null)
      if (r.success) return { success: true, message: `Created recurring event "${eventData.title}"${untilDate ? ` until ${untilDate}` : ' (repeating indefinitely)'}.`, expectsResponse: false }
      return { success: false, message: 'Could not create recurring event.', expectsResponse: false }
    }

    if (pendingAction?.type === 'recurring_scope') {
      const lower = inputText.toLowerCase()
      let scope = null
      if (lower.includes('just this') || lower.includes('only this') || lower.includes('this one') || lower.includes('single') || lower.includes('this instance')) scope = 'single'
      else if (lower.includes('all') || lower.includes('every') || lower.includes('future') || lower.includes('series') || lower.includes('permanently')) scope = 'all'
      if (!scope) return { success: true, message: 'Please specify: just this instance, or all future occurrences?', expectsResponse: true }
      if (pendingAction.operation === 'delete') { const r = await deleteRecurringEvent(pendingAction.event, scope); setPendingAction(null); return { success: r.success, message: r.success ? `Deleted ${scope === 'all' ? 'all occurrences of' : 'this instance of'} "${pendingAction.event.summary}".` : 'Could not delete event.', expectsResponse: false } }
      else if (pendingAction.operation === 'edit') { const r = await editRecurringEvent(pendingAction.event, scope, pendingAction.updates); setPendingAction(null); return { success: r.success, message: r.success ? `Updated ${scope === 'all' ? 'all occurrences of' : 'this instance of'} "${pendingAction.event.summary}".` : 'Could not update event.', expectsResponse: false } }
      setPendingAction(null)
      return { success: true, message: 'Cancelled.', expectsResponse: false }
    }

    if (pendingAction?.type === 'missing_info') {
      const details = { ...pendingAction.eventDetails }
      const stillMissing = []
      if (pendingAction.missing.includes('date')) {
        const dateMatch = inputText.match(/(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?|(\w+day)|tomorrow|today/i)
        if (dateMatch) {
          if (dateMatch[0].toLowerCase() === 'today') details.date = getDateString(new Date())
          else if (dateMatch[0].toLowerCase() === 'tomorrow') { const d = new Date(); d.setDate(d.getDate() + 1); details.date = getDateString(d) }
          else if (dateMatch[4]) {
            const days = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday']
            const targetDay = days.indexOf(dateMatch[4].toLowerCase())
            if (targetDay >= 0) { const d = new Date(); const currentDay = d.getDay(); const daysToAdd = (targetDay - currentDay + 7) % 7 || 7; d.setDate(d.getDate() + daysToAdd); details.date = getDateString(d) }
          } else {
            const month = parseInt(dateMatch[1]); const day = parseInt(dateMatch[2])
            const year = dateMatch[3] ? (dateMatch[3].length === 2 ? 2000 + parseInt(dateMatch[3]) : parseInt(dateMatch[3])) : new Date().getFullYear()
            details.date = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`
          }
        } else stillMissing.push('date')
      }
      if (pendingAction.missing.includes('time')) {
        const timeMatch = inputText.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i)
        if (timeMatch) {
          let h = parseInt(timeMatch[1]); const m = timeMatch[2] ? parseInt(timeMatch[2]) : 0; const period = timeMatch[3]?.toLowerCase()
          if (period === 'pm' && h < 12) h += 12
          if (period === 'am' && h === 12) h = 0
          if (!period && h >= 1 && h <= 5) h += 12
          if (!period && h >= 6 && h <= 11) {
            setPendingAction({ type: 'ampm', time: `${h}:${String(m).padStart(2, '0')}`, details })
            return { success: true, message: `Is that ${h} AM or ${h} PM?`, expectsResponse: true }
          }
          details.startTime = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
        } else stillMissing.push('time')
      }
      if (pendingAction.missing.includes('duration')) {
        const durationMatch = inputText.match(/(\d+)\s*(hour|hr|minute|min|m)?s?/i)
        if (durationMatch) {
          let duration = parseInt(durationMatch[1]); const unit = durationMatch[2]?.toLowerCase()
          if (unit && (unit.startsWith('hour') || unit === 'hr')) duration = duration * 60
          else if (!unit && duration <= 4) duration = duration * 60
          details.duration = duration
        } else stillMissing.push('duration')
      }
      if (stillMissing.length > 0) {
        setPendingAction({ type: 'missing_info', eventDetails: details, missing: stillMissing })
        return { success: true, message: `I still need the ${stillMissing.join(', ')}. Please provide.`, expectsResponse: true }
      }
      const r = await createEvent(details)
      setPendingAction(null)
      if (r.hasConflict) {
        const conflictNames = r.conflicts.map(c => c.summary).join(', ')
        setPendingAction({ type: 'confirm_conflict', eventData: details })
        return { success: true, message: `This conflicts with: ${conflictNames}. Schedule anyway?`, expectsResponse: true }
      }
      if (r.success) return { success: true, message: `Scheduled "${details.title}" for ${formatDuration(details.duration)} at ${formatTime12h(details.startTime)}.`, expectsResponse: false }
      return { success: false, message: 'Could not create event.', expectsResponse: false }
    }

    if (pendingAction?.type === 'event_name') {
      const eventName = inputText.trim()
      if (eventName.length < 2) return { success: true, message: 'Please give me a more descriptive name for this event.', expectsResponse: true }
      const details = { ...pendingAction.partialDetails, title: eventName }
      const missing = []
      if (!details.date) missing.push('date')
      if (!details.startTime) missing.push('time')
      if (!details.duration) missing.push('duration')
      if (missing.length > 0) {
        setPendingAction({ type: 'missing_info', eventDetails: details, missing })
        return { success: true, message: `Got it, "${eventName}". Now I need the ${missing.join(', ')}.`, expectsResponse: true }
      }
      const r = await createEvent(details)
      setPendingAction(null)
      if (r.success) return { success: true, message: `Scheduled "${details.title}" for ${formatDuration(details.duration)} at ${formatTime12h(details.startTime)}.`, expectsResponse: false }
      return { success: false, message: 'Could not create event.', expectsResponse: false }
    }

    // Execute a single parsed action
    const executeAction = async (parsed) => {
      const expectsResponse = parsed.expectsResponse || false

      // Track context for pronoun resolution
      if (parsed.eventTitle || parsed.title) {
        const name = parsed.eventTitle || parsed.title
        const isTask = ['add_task','edit_task','complete_task','uncomplete_task','delete_task'].includes(parsed.action)
        setLastMentioned({ type: isTask ? 'task' : 'event', name, date: parsed.date || parsed.newDate || null })
      }

      if (parsed.action === 'ask_time') { setPendingAction({ type: 'time', details: { ...parsed.eventDetails } }); return { success: true, message: parsed.response, expectsResponse: true } }
      if (parsed.action === 'ask_ampm') { setPendingAction({ type: 'ampm', time: parsed.time, details: { ...parsed.eventDetails } }); return { success: true, message: parsed.response, expectsResponse: true } }
      if (parsed.action === 'ask_missing_info') { setPendingAction({ type: 'missing_info', eventDetails: parsed.eventDetails, missing: parsed.missing }); return { success: true, message: parsed.response, expectsResponse: true } }
      if (parsed.action === 'ask_event_name') { setPendingAction({ type: 'event_name', partialDetails: parsed.partialDetails || {} }); return { success: true, message: parsed.response, expectsResponse: true } }
      if (parsed.action === 'ask_duration') { setPendingAction({ type: 'duration', details: { ...parsed.eventDetails } }); return { success: true, message: parsed.response, expectsResponse: true } }

      if (parsed.action === 'get_weather') {
        const loc = parsed.location === 'current' ? userLocation : parsed.location
        const r = await fetchWeatherForLocation(loc)
        if (r.success) return { success: true, message: `Weather in ${r.weather.name}: ${Math.round(r.weather.main.temp)}°F, ${r.weather.weather[0].description}. High ${Math.round(r.weather.main.temp_max)}°, low ${Math.round(r.weather.main.temp_min)}°.`, expectsResponse: false }
        return { success: false, message: 'Could not get weather for that location.', expectsResponse: false }
      }

      if (parsed.action === 'add_rule') { addBehavioralRule(parsed.rule); return { success: true, message: parsed.response, expectsResponse: false } }
      if (parsed.action === 'ask_task_type') { setPendingAction({ type: 'task_type', details: { title: parsed.title, description: parsed.description || '' } }); return { success: true, message: parsed.response || 'Is this a general task or does it have a due date?', expectsResponse: true } }
      if (parsed.action === 'out_of_scope') return { success: true, message: parsed.response, expectsResponse: false }

      if (parsed.action === 'add_task') {
        const taskType = parsed.type || 'due'
        const r = await addGoogleTask(parsed.title, parsed.dueDate, taskType, parsed.description || '')
        if (r.success) {
          if (taskType === 'general') return { success: true, message: parsed.response || `Added general task "${parsed.title}".`, expectsResponse: false }
          const dueStr = parsed.dueDate ? ` due ${parseLocalDate(parsed.dueDate).toLocaleDateString()}` : ''
          return { success: true, message: parsed.response || `Added "${parsed.title}"${dueStr}.`, expectsResponse: false }
        }
        return { success: false, message: 'Failed to add task.', expectsResponse: false }
      }

      if (parsed.action === 'edit_task') {
        const match = findTaskByFuzzyMatch(parsed.taskTitle)
        if (match.confidence === 'exact' || match.confidence === 'high') {
          const r = await updateGoogleTask(match.task.id, parsed.updates)
          if (r.success) {
            let response = `Updated "${match.task.title}"`
            if (parsed.updates.title) response = `Renamed to "${parsed.updates.title}"`
            if (parsed.updates.dueDate) response += `, now due ${parseLocalDate(parsed.updates.dueDate).toLocaleDateString()}`
            if (parsed.updates.description) response += `, added description`
            return { success: true, message: response + '.', expectsResponse: false }
          }
          return { success: false, message: 'Could not update task.', expectsResponse: false }
        }
        if (match.confidence === 'medium') { setPendingAction({ type: 'confirm_task', task: match.task, operation: 'edit', updates: parsed.updates }); return { success: true, message: `Did you mean "${match.task.title}"?`, expectsResponse: true } }
        return { success: false, message: 'Task not found.', expectsResponse: false }
      }

      if (parsed.action === 'complete_task') {
        const match = findTaskByFuzzyMatch(parsed.taskTitle)
        if (match.confidence === 'exact' || match.confidence === 'high') { const r = await completeTask(match.task.id); return { success: r.success, message: r.success ? `Completed "${match.task.title}".` : 'Could not complete task.', expectsResponse: false } }
        if (match.confidence === 'medium') { setPendingAction({ type: 'confirm_task', task: match.task, operation: 'complete' }); return { success: true, message: `Did you mean "${match.task.title}"?`, expectsResponse: true } }
        if (match.confidence === 'ambiguous') return { success: false, message: `Multiple matches: ${match.candidates.join(', ')}. Please be more specific.`, expectsResponse: false }
        return { success: false, message: 'Task not found.', expectsResponse: false }
      }

      if (parsed.action === 'uncomplete_task') {
        const match = findTaskByFuzzyMatch(parsed.taskTitle, true)
        if (match.confidence === 'exact' || match.confidence === 'high') { const r = await uncompleteTask(match.task.id); return { success: r.success, message: r.success ? `Marked "${match.task.title}" as incomplete.` : 'Could not update task.', expectsResponse: false } }
        return { success: false, message: 'Task not found in completed tasks.', expectsResponse: false }
      }

      if (parsed.action === 'delete_task') {
        const match = findTaskByFuzzyMatch(parsed.taskTitle)
        if (match.confidence === 'exact' || match.confidence === 'high') { const r = await deleteGoogleTask(match.task.id); return { success: r.success, message: r.success ? `Deleted "${match.task.title}".` : 'Could not delete task.', expectsResponse: false } }
        if (match.confidence === 'medium') { setPendingAction({ type: 'confirm_task', task: match.task, operation: 'delete' }); return { success: true, message: `Did you mean "${match.task.title}"?`, expectsResponse: true } }
        return { success: false, message: 'Task not found.', expectsResponse: false }
      }

      if (parsed.action === 'bulk_delete_tasks') {
        let tasksToDelete = []; const filter = parsed.filter || 'completed'
        if (filter === 'completed') tasksToDelete = googleTasks.filter(t => t.status === 'completed')
        else if (filter === 'overdue') tasksToDelete = googleTasks.filter(t => { if (t.status === 'completed') return false; const { type } = parseTaskNotes(t.notes); if (type === 'general' || !t.due) return false; const dueDate = parseTaskDueDate(t.due); if (!dueDate) return false; const today = new Date(); today.setHours(0,0,0,0); dueDate.setHours(0,0,0,0); return dueDate < today })
        else if (filter === 'all') { setPendingAction({ type: 'confirm_bulk_delete', filter: 'all', count: googleTasks.length }); return { success: true, message: `Are you sure you want to delete ALL ${googleTasks.length} tasks?`, expectsResponse: true } }
        if (tasksToDelete.length === 0) return { success: true, message: `No ${filter} tasks to delete.`, expectsResponse: false }
        const r = await bulkDeleteTasks(tasksToDelete.map(t => t.id))
        return { success: r.success, message: r.success ? `Deleted ${r.deleted} ${filter} task${r.deleted > 1 ? 's' : ''}.` : 'Could not delete tasks.', expectsResponse: false }
      }

      if (parsed.action === 'delete_duplicate_tasks') {
        const r = await deleteDuplicateTasks()
        return { success: r.success, message: r.message, expectsResponse: false }
      }

      if (parsed.action === 'create_event') {
        const eventData = { title: parsed.title, date: parsed.date, startTime: parsed.startTime, duration: parsed.duration || 60, location: parsed.location || null, description: parsed.description || null }
        const r = await createEvent(eventData)
        if (r.hasConflict) {
          const conflictNames = r.conflicts.map(c => { const start = new Date(c.start.dateTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }); const end = new Date(c.end.dateTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }); return `${c.summary} (${start}-${end})` }).join(', ')
          setPendingAction({ type: 'confirm_conflict', eventData })
          return { success: true, message: `This conflicts with: ${conflictNames}. Do you want to schedule anyway?`, expectsResponse: true }
        }
        if (r.success) { let response = parsed.response || `Scheduled "${parsed.title}" at ${formatTime12h(parsed.startTime)}`; if (parsed.location) response += ` at ${parsed.location}`; return { success: true, message: response + '.', expectsResponse: false } }
        return { success: false, message: 'Could not create event.', expectsResponse: false }
      }

      if (parsed.action === 'update_event') {
        const targetDate = parsed.date ? new Date(parsed.date + 'T12:00:00') : null
        const match = await findEventByFuzzyMatch(parsed.eventTitle, targetDate)
        if (match.confidence === 'exact' || match.confidence === 'high') {
          const updates = {}; if (parsed.updates?.title) updates.summary = parsed.updates.title; if (parsed.updates?.location !== undefined) updates.location = parsed.updates.location; if (parsed.updates?.description !== undefined) updates.description = parsed.updates.description
          const r = await updateEventById(match.event.id, match.event.calendarId, updates)
          if (r.success) return { success: true, message: parsed.response || `Updated "${match.event.summary}".`, expectsResponse: false }
          return { success: false, message: 'Could not update the event.', expectsResponse: false }
        }
        if (match.confidence === 'medium') { setPendingAction({ type: 'confirm_event', event: match.event, operation: 'update', updates: parsed.updates }); return { success: true, message: `Did you mean "${match.event.summary}"?`, expectsResponse: true } }
        return { success: false, message: 'Event not found.', expectsResponse: false }
      }

      if (parsed.action === 'delete_event') {
        const targetDate = parsed.date ? new Date(parsed.date + 'T12:00:00') : null
        const match = await findEventByFuzzyMatch(parsed.eventTitle, targetDate)
        if (match.confidence === 'exact' || match.confidence === 'high') { await deleteEventById(match.event.id, match.event.calendarId); return { success: true, message: parsed.response || `Deleted "${match.event.summary}".`, expectsResponse: false } }
        if (match.confidence === 'medium') { setPendingAction({ type: 'confirm_event', event: match.event, operation: 'delete' }); return { success: true, message: `Did you mean "${match.event.summary}"?`, expectsResponse: true } }
        if (match.confidence === 'ambiguous') return { success: false, message: `Multiple events found: ${match.candidates.join(', ')}. Please be more specific.`, expectsResponse: false }
        return { success: false, message: 'Event not found.', expectsResponse: false }
      }

      if (parsed.action === 'reschedule_event') {
        const targetDate = parsed.date ? new Date(parsed.date + 'T12:00:00') : null
        const match = await findEventByFuzzyMatch(parsed.eventTitle, targetDate)
        if (match.confidence === 'exact' || match.confidence === 'high') {
          // Handle timeShift (e.g. "push back 1 hour" = +60)
          let newStartTime = parsed.newStartTime || null
          if (parsed.timeShift && match.event.start?.dateTime) {
            const existingStart = new Date(match.event.start.dateTime)
            existingStart.setMinutes(existingStart.getMinutes() + parsed.timeShift)
            newStartTime = `${String(existingStart.getHours()).padStart(2,'0')}:${String(existingStart.getMinutes()).padStart(2,'0')}`
          }
          const newDate = parsed.newDate || (newStartTime && !parsed.timeShift ? getDateString(getEventDate(match.event)) : null) || getDateString(getEventDate(match.event))
          const r = await updateEventById(match.event.id, match.event.calendarId, { startTime: newStartTime, date: newDate, duration: parsed.newDuration })
          if (r.success) {
            let msg = parsed.response || `Rescheduled "${match.event.summary}"`
            if (!parsed.response) {
              if (newStartTime) msg += ` to ${formatTime12h(newStartTime)}`
              if (parsed.newDate) msg += ` on ${formatDate(parseLocalDate(parsed.newDate))}`
              msg += '.'
            }
            setLastMentioned({ type: 'event', name: match.event.summary, date: newDate })
            return { success: true, message: msg, expectsResponse: false }
          }
          return { success: false, message: 'Could not reschedule the event.', expectsResponse: false }
        }
        if (match.confidence === 'medium') { setPendingAction({ type: 'confirm_event', event: match.event, operation: 'reschedule', newStartTime: parsed.newStartTime, newDate: parsed.newDate, newDuration: parsed.newDuration, timeShift: parsed.timeShift, date: parsed.date }); return { success: true, message: `Did you mean "${match.event.summary}"?`, expectsResponse: true } }
        return { success: false, message: 'Event not found.', expectsResponse: false }
      }

      if (parsed.action === 'clear_day') {
        const [y, m, d] = parsed.date.split('-').map(Number)
        const targetDate = new Date(y, m - 1, d)
        const events = await fetchEventsForDate(accessToken, targetDate, calendarList)
        const deletableEvents = events.filter(e => !isCanvasEvent(e) && !isHolidayEvent(e))
        if (deletableEvents.length === 0) return { success: true, message: `You have no events to clear on ${formatDate(targetDate)}.`, expectsResponse: false }
        if (!parsed.confirm) {
          const eventNames = deletableEvents.slice(0, 5).map(e => e.summary).join(', ')
          const moreText = deletableEvents.length > 5 ? ` and ${deletableEvents.length - 5} more` : ''
          setPendingAction({ type: 'confirm_clear_day', date: parsed.date, eventCount: deletableEvents.length })
          return { success: true, message: `You have ${deletableEvents.length} event${deletableEvents.length > 1 ? 's' : ''} on ${formatDate(targetDate)}: ${eventNames}${moreText}. Are you sure you want to clear them all?`, expectsResponse: true }
        }
        const r = await deleteEventsInRange(parsed.date)
        return { success: true, message: r.deleted > 0 ? `Cleared ${r.deleted} event${r.deleted > 1 ? 's' : ''}.` : 'No events to clear.', expectsResponse: false }
      }

      if (parsed.action === 'create_recurring_event') {
        if (!parsed.recurrence.until && parsed.recurrence.until !== null) {
          setPendingAction({ type: 'recurring_end_date', eventData: { title: parsed.title, date: parsed.date, startTime: parsed.startTime, duration: parsed.duration || 60, location: parsed.location, description: parsed.description, recurrence: parsed.recurrence }})
          return { success: true, message: 'When should this recurring event end? (e.g., "end of semester", "December 31", "3 months", or "indefinitely")', expectsResponse: true }
        }
        const r = await createRecurringEvent({ title: parsed.title, date: parsed.date, startTime: parsed.startTime, duration: parsed.duration || 60, location: parsed.location, description: parsed.description, recurrence: parsed.recurrence })
        if (r.success) {
          const freqText = parsed.recurrence.frequency === 'daily' ? 'daily' : parsed.recurrence.frequency === 'weekly' ? `every ${parsed.recurrence.daysOfWeek?.join(', ') || 'week'}` : 'monthly'
          return { success: true, message: `Created recurring event "${parsed.title}" (${freqText}).`, expectsResponse: false }
        }
        return { success: false, message: 'Could not create recurring event.', expectsResponse: false }
      }

      if (parsed.action === 'ask_recurring_scope') {
        const targetDate = parsed.date ? new Date(parsed.date + 'T12:00:00') : null
        const match = await findEventByFuzzyMatch(parsed.eventTitle, targetDate)
        if (match.confidence === 'exact' || match.confidence === 'high') {
          if (isRecurringEvent(match.event)) {
            setPendingAction({ type: 'recurring_scope', event: match.event, operation: parsed.operation, updates: parsed.updates })
            return { success: true, message: parsed.response || 'Do you want to change just this instance, or all future occurrences?', expectsResponse: true }
          } else {
            if (parsed.operation === 'delete') { await deleteEventById(match.event.id, match.event.calendarId); return { success: true, message: `Deleted "${match.event.summary}".`, expectsResponse: false } }
            else if (parsed.operation === 'edit') { const r = await updateEventById(match.event.id, match.event.calendarId, parsed.updates); return { success: r.success, message: r.success ? `Updated "${match.event.summary}".` : 'Could not update event.', expectsResponse: false } }
          }
        }
        return { success: false, message: 'Event not found.', expectsResponse: false }
      }

      if (parsed.action === 'edit_recurring_event') {
        const targetDate = parsed.date ? new Date(parsed.date + 'T12:00:00') : null
        const match = await findEventByFuzzyMatch(parsed.eventTitle, targetDate)
        if (match.confidence === 'exact' || match.confidence === 'high') {
          if (isRecurringEvent(match.event) && !parsed.editScope) { setPendingAction({ type: 'recurring_scope', event: match.event, operation: 'edit', updates: parsed.updates }); return { success: true, message: 'Do you want to change just this instance, or all future occurrences?', expectsResponse: true } }
          const r = await editRecurringEvent(match.event, parsed.editScope || 'single', parsed.updates)
          return { success: r.success, message: r.success ? `Updated "${match.event.summary}".` : 'Could not update event.', expectsResponse: false }
        }
        return { success: false, message: 'Event not found.', expectsResponse: false }
      }

      if (parsed.action === 'delete_recurring_event') {
        const targetDate = parsed.date ? new Date(parsed.date + 'T12:00:00') : null
        const match = await findEventByFuzzyMatch(parsed.eventTitle, targetDate)
        if (match.confidence === 'exact' || match.confidence === 'high') {
          if (isRecurringEvent(match.event) && !parsed.deleteScope) { setPendingAction({ type: 'recurring_scope', event: match.event, operation: 'delete' }); return { success: true, message: 'Do you want to delete just this instance, or all future occurrences?', expectsResponse: true } }
          const r = await deleteRecurringEvent(match.event, parsed.deleteScope || 'single')
          return { success: r.success, message: r.success ? `Deleted "${match.event.summary}".` : 'Could not delete event.', expectsResponse: false }
        }
        return { success: false, message: 'Event not found.', expectsResponse: false }
      }

      if (parsed.action === 'check_schedule') { const result = await getScheduleForDate(parsed.date); return { success: true, message: result.message, expectsResponse: false } }
      if (parsed.action === 'check_week_schedule') { const result = await getWeekSchedule(parsed.date); return { success: true, message: result.message, expectsResponse: false } }
      if (parsed.action === 'check_availability') { const result = await checkAvailabilityAtTime(parsed.date, parsed.time, parsed.duration || 60); return { success: true, message: result.message, expectsResponse: false } }
      if (parsed.action === 'find_free_time') { const result = await findFreeTimeSlots(parsed.date, parsed.duration || 30); return { success: true, message: result.message, expectsResponse: false } }
      if (parsed.action === 'query_tasks') { const result = queryTasks(parsed.filter || 'all'); return { success: true, message: result.message, expectsResponse: false } }

      return { success: true, message: parsed.response, expectsResponse }
    }

    // Get schedule context for AI
    const startDate = new Date(); const endDate = new Date(); endDate.setDate(endDate.getDate() + 14)
    let scheduleContext = ''
    if (accessToken && calendarList.length) {
      const events = await fetchEventsFromAllCalendars(accessToken, startDate, endDate, calendarList)
      if (events.length) scheduleContext = '\n\nUpcoming Schedule:\n' + events.slice(0, 15).map(e => {
        const start = getEventDate(e)
        if (e.start.dateTime) {
          const end = new Date(e.end.dateTime)
          return `- ${e.summary} on ${start.toLocaleDateString()} ${start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}-${end.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}`
        }
        return `- ${e.summary} on ${start.toLocaleDateString()} (all day)`
      }).join('\n')
    }

    const newUserMessage = `${scheduleContext}\n\nUser: "${inputText}"`
    const updatedHistory = [...conversationHistory, { role: 'user', content: newUserMessage }]

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': currentApiKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
        body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 1024, system: buildSystemPrompt(), messages: updatedHistory })
      })
      const data = await response.json()
      if (data.error || !data.content?.[0]) { console.error('API Error:', JSON.stringify(data)); return { success: false, message: data.error?.message || 'API error. Please try again.', expectsResponse: false } }

      let content = data.content[0].text.trim()
      content = content.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim()

      let parsed
      try { parsed = JSON.parse(content) } catch (parseErr) {
        console.error('JSON parse error:', parseErr, 'Content:', content)
        return { success: false, message: 'Nova had trouble understanding that. Please try again.', expectsResponse: false }
      }
      setConversationHistory([...updatedHistory, { role: 'assistant', content }].slice(-10))

      // Multi-action support
      if (parsed.actions && Array.isArray(parsed.actions)) {
        const results = []
        for (const action of parsed.actions) {
          const r = await executeAction(action)
          results.push(r)
        }
        const allSuccess = results.every(r => r.success)
        const hasExpects = results.some(r => r.expectsResponse)
        return { success: allSuccess, message: parsed.response || results.map(r => r.message).join(' '), expectsResponse: hasExpects }
      }

      return await executeAction(parsed)
    } catch (error) {
      console.error('Nova error:', error)
      return { success: false, message: 'Something went wrong. Please try again.', expectsResponse: false }
    }
  }

  const handleChatSubmit = async (e) => {
    e.preventDefault()
    if (!chatInput.trim() || isProcessing) return
    const msg = chatInput.trim()
    setChatInput('')
    setChatMessages(prev => [...prev, { role: 'user', content: msg }])
    setIsProcessing(true)
    const r = await processCommand(msg)
    setChatMessages(prev => [...prev, { role: 'assistant', content: r.message }])
    setIsProcessing(false)
  }

  return (
    <ChatContext.Provider value={{
      chatMessages, setChatMessages, chatInput, setChatInput,
      isProcessing, pendingAction, statusMessage, setStatusMessage,
      chatEndRef, processCommand, handleChatSubmit
    }}>
      {children}
    </ChatContext.Provider>
  )
}

export function useChat() {
  const ctx = useContext(ChatContext)
  if (!ctx) throw new Error('useChat must be used within ChatProvider')
  return ctx
}
