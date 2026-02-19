import { useWorkSession, formatMsLong } from '../../context/WorkSessionContext'
import './SessionHome.css'

export default function SessionHome({ onStartNew, onViewDetail }) {
  const { sessions } = useWorkSession()

  return (
    <div className="session-home">
      <div className="session-home__header">
        <h2 className="session-home__title">Work Sessions</h2>
        <button className="session-home__start-btn" onClick={onStartNew}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 4v16m8-8H4" /></svg>
          Start New Session
        </button>
      </div>

      {sessions.length === 0 ? (
        <div className="session-home__empty">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.4">
            <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p>No past sessions yet</p>
          <p className="session-home__empty-sub">Start a work session to track your focused time</p>
        </div>
      ) : (
        <div className="session-home__list">
          {sessions.map(session => {
            const completedTasks = session.tasks.filter(t => t.status === 'completed').length
            const totalTasks = session.tasks.length
            const startDate = new Date(session.startTime)

            return (
              <button
                key={session.id}
                className="session-home__card"
                onClick={() => onViewDetail(session.id)}
              >
                <div className="session-home__card-header">
                  <span className="session-home__card-date">
                    {startDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                  </span>
                  <span className="session-home__card-time">
                    {startDate.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                  </span>
                </div>
                <div className="session-home__card-stats">
                  <span className="session-home__card-stat">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    {formatMsLong(session.totalWorkMs)}
                  </span>
                  {totalTasks > 0 && (
                    <span className="session-home__card-stat">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 13l4 4L19 7" /></svg>
                      {completedTasks}/{totalTasks}
                    </span>
                  )}
                  {session.breaksTaken > 0 && (
                    <span className="session-home__card-stat">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      {session.breaksTaken} break{session.breaksTaken !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
