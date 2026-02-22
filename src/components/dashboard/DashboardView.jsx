import { useCalendar, eventIsOnDate, isHolidayEvent, isCanvasAllDayEvent } from '../../context/CalendarContext'
import { useTasks, taskIsOnDate } from '../../context/TaskContext'
import StatCard from './StatCard'
import TodayEvents from './TodayEvents'
import ChatPanel from '../chat/ChatPanel'
import './DashboardView.css'

export default function DashboardView() {
  const { allEvents } = useCalendar()
  const { googleTasks } = useTasks()

  const todayEvents = allEvents.filter(e => eventIsOnDate(e, new Date()) && !isHolidayEvent(e) && !isCanvasAllDayEvent(e))
  const pendingTasks = googleTasks.filter(t => t.status !== 'completed')
  const tasksDueToday = pendingTasks.filter(t => taskIsOnDate(t, new Date()))

  return (
    <div className="dashboard-view">
      <div className="dashboard-view__stats">
        <StatCard label="Today's Events" value={todayEvents.length} />
        <StatCard label="Due Today" value={tasksDueToday.length} />
        <StatCard label="Pending Tasks" value={pendingTasks.length} />
      </div>

      <div className="dashboard-view__grid">
        <ChatPanel />
        <div className="dashboard-view__sidebar">
          <TodayEvents />
          {tasksDueToday.length > 0 && (
            <div className="dashboard-view__due-today">
              <h3 className="dashboard-view__due-today-title">Tasks Due Today</h3>
              <div className="dashboard-view__due-today-list">
                {tasksDueToday.map(task => (
                  <div key={task.id} className="dashboard-view__due-today-item">
                    <span className="dashboard-view__due-today-dot" />
                    <span>{task.title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  )
}
