import './SessionTaskItem.css'

export default function SessionTaskItem({ task, mode, onRemove, onToggle }) {
  const isCompleted = task.status === 'completed'
  const isIncomplete = task.status === 'incomplete'

  return (
    <div className={`session-task ${isCompleted ? 'session-task--completed' : ''} ${isIncomplete ? 'session-task--incomplete' : ''}`}>
      {mode === 'setup' && (
        <>
          <span className="session-task__title">{task.title}</span>
          <span className="session-task__source">{task.source === 'google' ? 'Google Tasks' : 'Session'}</span>
          <button className="session-task__remove" onClick={() => onRemove(task.id)} title="Remove">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </>
      )}

      {mode === 'active' && (
        <>
          <button
            className={`session-task__check ${isCompleted ? 'session-task__check--done' : ''}`}
            onClick={() => onToggle(task.id, isCompleted ? 'pending' : 'completed')}
          >
            {isCompleted && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 13l4 4L19 7" /></svg>
            )}
          </button>
          <span className={`session-task__title ${isCompleted ? 'session-task__title--done' : ''}`}>{task.title}</span>
        </>
      )}

      {mode === 'completing' && (
        <>
          <div className="session-task__outcome-buttons">
            <button
              className={`session-task__outcome ${isCompleted ? 'session-task__outcome--completed' : ''}`}
              onClick={() => onToggle(task.id, 'completed')}
              title="Completed"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 13l4 4L19 7" /></svg>
            </button>
            <button
              className={`session-task__outcome ${isIncomplete ? 'session-task__outcome--incomplete' : ''}`}
              onClick={() => onToggle(task.id, 'incomplete')}
              title="Incomplete"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <span className={`session-task__title ${isCompleted ? 'session-task__title--done' : ''}`}>{task.title}</span>
        </>
      )}

      {mode === 'detail' && (
        <>
          <span className={`session-task__status-dot session-task__status-dot--${task.status}`} />
          <span className={`session-task__title ${isCompleted ? 'session-task__title--done' : ''}`}>{task.title}</span>
          <span className="session-task__status-label">{task.status}</span>
        </>
      )}
    </div>
  )
}
