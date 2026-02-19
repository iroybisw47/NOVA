import { useWorkSession, formatMsLong } from '../../context/WorkSessionContext'
import { useTasks } from '../../context/TaskContext'
import SessionTaskItem from './SessionTaskItem'
import './SessionCompleting.css'

export default function SessionCompleting() {
  const { activeSession, toggleSessionTaskStatus, saveAndFinish } = useWorkSession()
  const { completeTask } = useTasks()

  if (!activeSession) return null
  const { elapsedWorkMs, elapsedBreakMs, breaksTaken, tasks } = activeSession

  const handleSave = async () => {
    // Complete Google-sourced tasks that were marked completed
    for (const task of tasks) {
      if (task.source === 'google' && task.googleTaskId && task.status === 'completed') {
        await completeTask(task.googleTaskId)
      }
    }
    saveAndFinish()
  }

  const completedCount = tasks.filter(t => t.status === 'completed').length

  return (
    <div className="session-completing">
      <h2 className="session-completing__title">Session Complete</h2>

      <div className="session-completing__stats">
        <div className="session-completing__stat">
          <span className="session-completing__stat-value">{formatMsLong(elapsedWorkMs)}</span>
          <span className="session-completing__stat-label">Work Time</span>
        </div>
        <div className="session-completing__stat">
          <span className="session-completing__stat-value">{formatMsLong(elapsedBreakMs)}</span>
          <span className="session-completing__stat-label">Break Time</span>
        </div>
        <div className="session-completing__stat">
          <span className="session-completing__stat-value">{breaksTaken}</span>
          <span className="session-completing__stat-label">Breaks</span>
        </div>
      </div>

      {tasks.length > 0 && (
        <div className="session-completing__tasks">
          <h3 className="session-completing__tasks-title">
            Mark task outcomes ({completedCount}/{tasks.length} completed)
          </h3>
          <div className="session-completing__tasks-list">
            {tasks.map(task => (
              <SessionTaskItem
                key={task.id}
                task={task}
                mode="completing"
                onToggle={toggleSessionTaskStatus}
              />
            ))}
          </div>
        </div>
      )}

      <button className="session-completing__save" onClick={handleSave}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 13l4 4L19 7" /></svg>
        Save & Finish
      </button>
    </div>
  )
}
