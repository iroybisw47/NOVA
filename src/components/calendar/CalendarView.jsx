import { useCalendar } from '../../context/CalendarContext'
import TimeGrid from './TimeGrid'
import DayDetailPanel from './DayDetailPanel'
import './CalendarView.css'

const getWeekDates = (date) => {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day
  const week = []
  for (let i = 0; i < 7; i++) {
    const weekDay = new Date(d)
    weekDay.setDate(diff + i)
    week.push(weekDay)
  }
  return week
}

const formatWeekRange = (start, end) => {
  if (start.getMonth() === end.getMonth()) {
    return `${start.toLocaleDateString('en-US', { month: 'long' })} ${start.getDate()} - ${end.getDate()}, ${start.getFullYear()}`
  }
  return `${start.toLocaleDateString('en-US', { month: 'short' })} ${start.getDate()} - ${end.toLocaleDateString('en-US', { month: 'short' })} ${end.getDate()}, ${end.getFullYear()}`
}

export default function CalendarView() {
  const { calendarViewDate, setCalendarViewDate, selectedCalendarDay } = useCalendar()

  const weekDates = getWeekDates(calendarViewDate)
  const weekRangeText = formatWeekRange(weekDates[0], weekDates[6])

  const prevWeek = () => {
    const d = new Date(calendarViewDate)
    d.setDate(d.getDate() - 7)
    setCalendarViewDate(d)
  }

  const nextWeek = () => {
    const d = new Date(calendarViewDate)
    d.setDate(d.getDate() + 7)
    setCalendarViewDate(d)
  }

  const goToToday = () => setCalendarViewDate(new Date())

  return (
    <div className="calendar-view">
      <div className="calendar-view__main">
        <div className="calendar-view__header">
          <div className="calendar-view__nav">
            <button onClick={prevWeek} className="calendar-view__nav-btn">‹</button>
            <button onClick={nextWeek} className="calendar-view__nav-btn">›</button>
            <button onClick={goToToday} className="calendar-view__today-btn">Today</button>
          </div>
          <h2 className="calendar-view__week-range">{weekRangeText}</h2>
          <div className="calendar-view__spacer" />
        </div>
        <TimeGrid weekDates={weekDates} />
      </div>

      {selectedCalendarDay && <DayDetailPanel />}
    </div>
  )
}
