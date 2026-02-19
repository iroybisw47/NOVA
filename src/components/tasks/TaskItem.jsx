import { useTasks, parseTaskNotes, getTaskUrgencyColor } from '../../context/TaskContext'
import { parseTaskDueDate } from '../../context/CalendarContext'
import './TaskItem.css'

export default function TaskItem({ task }) {
  const { completeTask, uncompleteTask, deleteGoogleTask } = useTasks()
  const urgency = getTaskUrgencyColor(task)
  const { description } = parseTaskNotes(task.notes)
  const isCompleted = task.status === 'completed'

  return (
    <div
      className="task-item"
      style={{ borderLeftColor: urgency.border, backgroundColor: urgency.bg }}
    >
      <input
        type="checkbox"
        checked={isCompleted}
        onChange={() => isCompleted ? uncompleteTask(task.id) : completeTask(task.id)}
        className="task-item__checkbox"
      />
      <div className="task-item__content">
        <p className={`task-item__title ${isCompleted ? 'task-item__title--completed' : ''}`}>
          {task.title}
        </p>
        <div className="task-item__meta">
          <span className="task-item__urgency" style={{ color: urgency.text }}>{urgency.label}</span>
          {task.due && (
            <span className="task-item__due">📅 {parseTaskDueDate(task.due)?.toLocaleDateString()}</span>
          )}
        </div>
        {description && <p className="task-item__desc">📝 {description}</p>}
      </div>
      <button onClick={() => deleteGoogleTask(task.id)} className="task-item__delete">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  )
}
