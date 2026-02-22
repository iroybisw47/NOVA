import { useState } from 'react'
import { useWorkSession, formatMs, formatMsLong } from '../../context/WorkSessionContext'
import SessionTaskItem from './SessionTaskItem'
import './SessionActive.css'

export default function SessionActive() {
  const {
    activeSession, pauseSession, resumeSession, skipBreak, endSession,
    toggleSessionTaskStatus, addSessionTask, removeSessionTask,
  } = useWorkSession()

  const [newTaskTitle, setNewTaskTitle] = useState('')

  if (!activeSession) return null
  const { status, timerConfig, elapsedWorkMs, breakElapsedMs, breaksTaken, currentIntervalElapsedMs, tasks } = activeSession

  const totalMs = timerConfig.totalDurationMs
  const remaining = Math.max(0, totalMs - elapsedWorkMs)
  const progress = totalMs > 0 ? Math.min(elapsedWorkMs / totalMs, 1) : 0

  // SVG ring
  const size = 200
  const strokeWidth = 10
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference * (1 - progress)

  // Next break
  const nextBreakIn = timerConfig.breakIntervalMs > 0 && timerConfig.breakDurationMs > 0
    ? Math.max(0, timerConfig.breakIntervalMs - currentIntervalElapsedMs)
    : null

  const breakProgress = status === 'break' && timerConfig.breakDurationMs > 0
    ? Math.min(breakElapsedMs / timerConfig.breakDurationMs, 1)
    : 0
  const breakRemaining = status === 'break' ? Math.max(0, timerConfig.breakDurationMs - breakElapsedMs) : 0

  const isPaused = status === 'paused'
  const isBreak = status === 'break'

  const handleAddTask = () => {
    const title = newTaskTitle.trim()
    if (!title) return
    addSessionTask(title)
    setNewTaskTitle('')
  }

  return (
    <div className="session-active">
      <div className={`session-active__timer-area ${isBreak ? 'session-active__timer-area--break' : ''}`}>
        {/* Status badge */}
        <div className={`session-active__badge session-active__badge--${status}`}>
          {isPaused ? 'Paused' : isBreak ? 'Break' : 'Working'}
        </div>

        {/* Timer ring */}
        <div className="session-active__ring-wrapper">
          <svg className="session-active__ring" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            <circle
              className="session-active__ring-bg"
              cx={size / 2} cy={size / 2} r={radius}
              strokeWidth={strokeWidth}
            />
            <circle
              className="session-active__ring-progress"
              cx={size / 2} cy={size / 2} r={radius}
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          </svg>
          <div className="session-active__ring-text">
            {isBreak ? (
              <>
                <span className="session-active__countdown">{formatMs(breakRemaining)}</span>
                <span className="session-active__countdown-label">Break</span>
              </>
            ) : (
              <>
                <span className="session-active__countdown">{formatMs(remaining)}</span>
                <span className="session-active__countdown-label">Remaining</span>
              </>
            )}
          </div>
        </div>

        {/* Break overlay bar */}
        {isBreak && (
          <div className="session-active__break-bar">
            <div className="session-active__break-fill" style={{ width: `${breakProgress * 100}%` }} />
          </div>
        )}

        {/* Controls */}
        <div className="session-active__controls">
          {isBreak ? (
            <button className="session-active__btn session-active__btn--secondary" onClick={skipBreak}>
              Skip Break
            </button>
          ) : (
            <button
              className="session-active__btn session-active__btn--secondary"
              onClick={isPaused ? resumeSession : pauseSession}
            >
              {isPaused ? (
                <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3" /></svg> Resume</>
              ) : (
                <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 9v6m4-6v6" /></svg> Pause</>
              )}
            </button>
          )}
          <button className="session-active__btn session-active__btn--danger" onClick={endSession}>
            End Session
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="session-active__stats">
        <div className="session-active__stat">
          <span className="session-active__stat-label">Worked</span>
          <span className="session-active__stat-value">{formatMsLong(elapsedWorkMs)}</span>
        </div>
        <div className="session-active__stat">
          <span className="session-active__stat-label">Breaks</span>
          <span className="session-active__stat-value">{breaksTaken}</span>
        </div>
        {nextBreakIn !== null && !isBreak && !isPaused && (
          <div className="session-active__stat">
            <span className="session-active__stat-label">Next Break</span>
            <span className="session-active__stat-value">{formatMs(nextBreakIn)}</span>
          </div>
        )}
      </div>

      {/* Task checklist */}
      <div className="session-active__tasks">
        <h3 className="session-active__tasks-title">Tasks</h3>
        <div className="session-active__add-task-row">
          <input
            type="text"
            className="session-active__task-input"
            placeholder="Add a task..."
            value={newTaskTitle}
            onChange={e => setNewTaskTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddTask()}
          />
          <button className="session-active__add-task-btn" onClick={handleAddTask} disabled={!newTaskTitle.trim()}>
            +
          </button>
        </div>
        <div className="session-active__tasks-list">
          {tasks.map(task => (
            <SessionTaskItem
              key={task.id}
              task={task}
              mode="active"
              onToggle={toggleSessionTaskStatus}
              onRemove={removeSessionTask}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
