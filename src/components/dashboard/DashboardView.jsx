import { useState } from 'react'
import { useCalendar, eventIsOnDate, formatEventTimeRange, isHolidayEvent, isCanvasAllDayEvent } from '../../context/CalendarContext'
import { useTasks, parseTaskNotes, taskIsOnDate } from '../../context/TaskContext'
import ChatPanel from '../chat/ChatPanel'
import './DashboardView.css'

export default function DashboardView() {
  const { allEvents, deleteEventById } = useCalendar()
  const { googleTasks } = useTasks()
  const [activeTab, setActiveTab] = useState('events')

  const todayEvents = allEvents.filter(e => eventIsOnDate(e, new Date()) && !isHolidayEvent(e) && !isCanvasAllDayEvent(e))
  const pendingTasks = googleTasks.filter(t => t.status !== 'completed')

  // Tasks due today (actual due date tasks) get orange dot
  // General tasks (no due date / general type) get green dot
  const todayTasks = pendingTasks.filter(t => {
    const { type } = parseTaskNotes(t.notes)
    if (type === 'general') return true
    return taskIsOnDate(t, new Date())
  })

  return (
    <div className="dashboard-view">
      <div className="dashboard-view__grid">
        <ChatPanel />
        <div className="dashboard-view__sidebar">
          <div className="dashboard-view__tabs">
            <button
              className={`dashboard-view__tab ${activeTab === 'events' ? 'dashboard-view__tab--active' : ''}`}
              onClick={() => setActiveTab('events')}
            >
              Events ({todayEvents.length})
            </button>
            <button
              className={`dashboard-view__tab ${activeTab === 'tasks' ? 'dashboard-view__tab--active' : ''}`}
              onClick={() => setActiveTab('tasks')}
            >
              Tasks ({todayTasks.length})
            </button>
          </div>

          <div className="dashboard-view__tab-content">
            {activeTab === 'events' ? (
              <div className="dashboard-view__events-list">
                {todayEvents.length > 0 ? todayEvents.map(event => (
                  <div key={event.id} className="dashboard-view__event-item">
                    <div style={{ flex: 1 }}>
                      <p className="dashboard-view__event-name">{event.summary}</p>
                      <p className="dashboard-view__event-time">{formatEventTimeRange(event)}</p>
                      {event.location && <p className="dashboard-view__event-location">{event.location}</p>}
                    </div>
                    <button
                      onClick={() => deleteEventById(event.id, event.calendarId)}
                      className="dashboard-view__event-delete"
                      title="Delete event"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )) : (
                  <p className="dashboard-view__empty">No events today</p>
                )}
              </div>
            ) : (
              <div className="dashboard-view__tasks-list">
                {todayTasks.length > 0 ? todayTasks.map(task => {
                  const { type } = parseTaskNotes(task.notes)
                  const isGeneral = type === 'general'

                  return (
                    <div key={task.id} className="dashboard-view__task-item">
                      <span className={`dashboard-view__task-dot ${isGeneral ? 'dashboard-view__task-dot--general' : 'dashboard-view__task-dot--due'}`} />
                      <span className="dashboard-view__task-name">{task.title}</span>
                    </div>
                  )
                }) : (
                  <p className="dashboard-view__empty">No tasks for today</p>
                )}
                <div className="dashboard-view__task-legend">
                  <span className="dashboard-view__legend-item">
                    <span className="dashboard-view__task-dot dashboard-view__task-dot--due" /> Due today
                  </span>
                  <span className="dashboard-view__legend-item">
                    <span className="dashboard-view__task-dot dashboard-view__task-dot--general" /> General
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
