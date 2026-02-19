import { useState } from 'react'
import { useWorkSession, formatMsLong, parseTimerInput } from '../../context/WorkSessionContext'
import { useTasks, parseTaskNotes, getTaskUrgencyColor } from '../../context/TaskContext'
import { parseTaskDueDate } from '../../context/CalendarContext'
import SessionTaskItem from './SessionTaskItem'
import './SessionSetup.css'

export default function SessionSetup() {
  const {
    activeSession, updateTimerConfig, saveDefaults,
    addSessionTask, removeSessionTask, startSession, cancelSession,
  } = useWorkSession()
  const { googleTasks } = useTasks()

  const [nlInput, setNlInput] = useState('')
  const [nlPreview, setNlPreview] = useState(null)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [showImport, setShowImport] = useState(false)

  if (!activeSession) return null
  const { timerConfig, tasks } = activeSession

  const handleNlApply = () => {
    const parsed = parseTimerInput(nlInput)
    if (parsed) {
      updateTimerConfig(parsed)
      setNlPreview(parsed)
      setNlInput('')
    }
  }

  const handleNlKeyDown = (e) => {
    if (e.key === 'Enter') handleNlApply()
  }

  const handleManualChange = (field, value) => {
    const ms = Math.max(0, parseInt(value) || 0) * 60000
    updateTimerConfig({ [field]: ms })
  }

  const handleAddTask = () => {
    const title = newTaskTitle.trim()
    if (!title) return
    addSessionTask(title)
    setNewTaskTitle('')
  }

  const handleAddTaskKeyDown = (e) => {
    if (e.key === 'Enter') handleAddTask()
  }

  const handleImportGoogleTask = (gTask) => {
    const alreadyAdded = tasks.some(t => t.googleTaskId === gTask.id)
    if (alreadyAdded) return
    addSessionTask(gTask.title, 'google', gTask.id)
  }

  const handleSaveDefaults = () => {
    saveDefaults(timerConfig)
  }

  const incompleteTasks = googleTasks.filter(t => t.status !== 'completed')
  const importedIds = new Set(tasks.filter(t => t.googleTaskId).map(t => t.googleTaskId))

  return (
    <div className="session-setup">
      <div className="session-setup__header">
        <button className="session-setup__back" onClick={cancelSession}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
          Back
        </button>
        <h2 className="session-setup__title">Setup Session</h2>
      </div>

      {/* Timer Configuration */}
      <section className="session-setup__section">
        <h3 className="session-setup__section-title">Timer</h3>

        <div className="session-setup__nl-row">
          <input
            type="text"
            className="session-setup__nl-input"
            placeholder='e.g. "1 hour with 5 min breaks every 25 min" or "pomodoro 25/5"'
            value={nlInput}
            onChange={e => setNlInput(e.target.value)}
            onKeyDown={handleNlKeyDown}
          />
          <button className="session-setup__nl-btn" onClick={handleNlApply} disabled={!nlInput.trim()}>
            Apply
          </button>
        </div>

        {nlPreview && (
          <div className="session-setup__nl-preview">
            Parsed: {formatMsLong(nlPreview.totalDurationMs)} total, {nlPreview.breakDurationMs ? formatMsLong(nlPreview.breakDurationMs) + ' breaks' : 'no breaks'}{nlPreview.breakIntervalMs ? ' every ' + formatMsLong(nlPreview.breakIntervalMs) : ''}
          </div>
        )}

        <div className="session-setup__fields">
          <label className="session-setup__field">
            <span>Total Duration (min)</span>
            <input
              type="number"
              min="1"
              value={Math.round(timerConfig.totalDurationMs / 60000)}
              onChange={e => handleManualChange('totalDurationMs', e.target.value)}
            />
          </label>
          <label className="session-setup__field">
            <span>Break Duration (min)</span>
            <input
              type="number"
              min="0"
              value={Math.round(timerConfig.breakDurationMs / 60000)}
              onChange={e => handleManualChange('breakDurationMs', e.target.value)}
            />
          </label>
          <label className="session-setup__field">
            <span>Break Every (min)</span>
            <input
              type="number"
              min="0"
              value={Math.round(timerConfig.breakIntervalMs / 60000)}
              onChange={e => handleManualChange('breakIntervalMs', e.target.value)}
            />
          </label>
        </div>

        <button className="session-setup__save-defaults" onClick={handleSaveDefaults}>
          Save as Defaults
        </button>
      </section>

      {/* Tasks */}
      <section className="session-setup__section">
        <h3 className="session-setup__section-title">Tasks</h3>

        <div className="session-setup__add-task-row">
          <input
            type="text"
            className="session-setup__task-input"
            placeholder="Add a task for this session..."
            value={newTaskTitle}
            onChange={e => setNewTaskTitle(e.target.value)}
            onKeyDown={handleAddTaskKeyDown}
          />
          <button className="session-setup__add-task-btn" onClick={handleAddTask} disabled={!newTaskTitle.trim()}>
            Add
          </button>
        </div>

        {tasks.length > 0 && (
          <div className="session-setup__task-list">
            {tasks.map(task => (
              <SessionTaskItem key={task.id} task={task} mode="setup" onRemove={removeSessionTask} />
            ))}
          </div>
        )}

        <button
          className="session-setup__import-toggle"
          onClick={() => setShowImport(!showImport)}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d={showImport ? 'M19 9l-7 7-7-7' : 'M9 5l7 7-7 7'} />
          </svg>
          Import from Google Tasks ({incompleteTasks.length})
        </button>

        {showImport && incompleteTasks.length > 0 && (
          <div className="session-setup__import-list">
            {incompleteTasks.map(gTask => {
              const urgency = getTaskUrgencyColor(gTask)
              const { description } = parseTaskNotes(gTask.notes)
              const isAdded = importedIds.has(gTask.id)

              return (
                <button
                  key={gTask.id}
                  className={`session-setup__import-item ${isAdded ? 'session-setup__import-item--added' : ''}`}
                  onClick={() => handleImportGoogleTask(gTask)}
                  disabled={isAdded}
                  style={{ borderLeftColor: urgency.border, backgroundColor: urgency.bg }}
                >
                  <div className="session-setup__import-content">
                    <p className="session-setup__import-title">{gTask.title}</p>
                    <div className="session-setup__import-meta">
                      <span className="session-setup__import-urgency" style={{ color: urgency.text }}>{urgency.label}</span>
                      {gTask.due && (
                        <span className="session-setup__import-due">📅 {parseTaskDueDate(gTask.due)?.toLocaleDateString()}</span>
                      )}
                    </div>
                    {description && <p className="session-setup__import-desc">📝 {description}</p>}
                  </div>
                  <span className="session-setup__import-action">
                    {isAdded ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 13l4 4L19 7" /></svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 4v16m8-8H4" /></svg>
                    )}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </section>

      {/* Start Button */}
      <button className="session-setup__start" onClick={startSession}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3" /></svg>
        Start Session
      </button>
    </div>
  )
}
