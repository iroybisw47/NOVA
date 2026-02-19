import { useCalendar, eventIsOnDate, isHolidayEvent, isCanvasAllDayEvent } from '../../context/CalendarContext'
import { useTasks } from '../../context/TaskContext'
import StatCard from './StatCard'
import TodayEvents from './TodayEvents'
import ChatPanel from '../chat/ChatPanel'
import './DashboardView.css'

export default function DashboardView() {
  const { allEvents } = useCalendar()
  const { googleTasks } = useTasks()

  const todayEvents = allEvents.filter(e => eventIsOnDate(e, new Date()) && !isHolidayEvent(e) && !isCanvasAllDayEvent(e))
  const pendingTasks = googleTasks.filter(t => t.status !== 'completed').length
  const completedThisWeek = googleTasks.filter(t => {
    if (t.status !== 'completed' || !t.completed) return false
    const completedDate = new Date(t.completed)
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    return completedDate >= weekAgo
  }).length

  return (
    <div className="dashboard-view">
      <div className="dashboard-view__stats">
        <StatCard label="Today's Events" value={todayEvents.length} />
        <StatCard label="Pending Tasks" value={pendingTasks} />
        <StatCard label="Completed This Week" value={completedThisWeek} />
      </div>

      <div className="dashboard-view__grid">
        <ChatPanel />
        <TodayEvents />
      </div>

    </div>
  )
}
