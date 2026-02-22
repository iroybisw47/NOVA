import { useWorkSession, formatMsLong } from '../../context/WorkSessionContext'
import SessionTaskItem from './SessionTaskItem'
import './SessionDetail.css'

export default function SessionDetail({ sessionId, onBack }) {
  const { sessions, deleteSessionLog } = useWorkSession()
  const session = sessions.find(s => s.id === sessionId)

  if (!session) return null

  const startDate = new Date(session.startTime)
  const endDate = new Date(session.endTime)
  const completedTasks = session.tasks.filter(t => t.status === 'completed').length

  const handleDelete = () => {
    deleteSessionLog(sessionId)
    onBack()
  }

  return (
    <div className="session-detail">
      <div className="session-detail__header">
        <button className="session-detail__back" onClick={onBack}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
          Back
        </button>
        <h2 className="session-detail__title">Session Details</h2>
      </div>

      <div className="session-detail__date-block">
        <span className="session-detail__date">
          {startDate.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </span>
        <span className="session-detail__time">
          {startDate.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })} — {endDate.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
        </span>
      </div>

      {session.description && (
        <p className="session-detail__description">{session.description}</p>
      )}

      <div className="session-detail__stats">
        <div className="session-detail__stat">
          <span className="session-detail__stat-value">{formatMsLong(session.totalWorkMs)}</span>
          <span className="session-detail__stat-label">Work Time</span>
        </div>
        <div className="session-detail__stat">
          <span className="session-detail__stat-value">{formatMsLong(session.totalBreakMs)}</span>
          <span className="session-detail__stat-label">Break Time</span>
        </div>
        <div className="session-detail__stat">
          <span className="session-detail__stat-value">{session.breaksTaken}</span>
          <span className="session-detail__stat-label">Breaks</span>
        </div>
      </div>

      <div className="session-detail__config">
        <span>Timer: {formatMsLong(session.timerConfig.totalDurationMs)}</span>
        {session.timerConfig.breakDurationMs > 0 && (
          <span>{formatMsLong(session.timerConfig.breakDurationMs)} breaks every {formatMsLong(session.timerConfig.breakIntervalMs)}</span>
        )}
      </div>

      {session.tasks.length > 0 && (
        <div className="session-detail__tasks">
          <h3 className="session-detail__tasks-title">
            Tasks ({completedTasks}/{session.tasks.length} completed)
          </h3>
          <div className="session-detail__tasks-list">
            {session.tasks.map(task => (
              <SessionTaskItem key={task.id} task={task} mode="detail" />
            ))}
          </div>
        </div>
      )}

      <button className="session-detail__delete" onClick={handleDelete}>
        Delete Session
      </button>
    </div>
  )
}
