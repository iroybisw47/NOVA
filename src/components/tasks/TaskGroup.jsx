import TaskItem from './TaskItem'
import './TaskGroup.css'

export default function TaskGroup({ title, icon, titleColor, tasks }) {
  if (!tasks.length) return null

  return (
    <div className="task-group">
      <div className="task-group__header">
        <span className="task-group__icon">{icon}</span>
        <h3 className="task-group__title" style={{ color: titleColor }}>
          {title} ({tasks.length})
        </h3>
      </div>
      {tasks.map(task => <TaskItem key={task.id} task={task} />)}
    </div>
  )
}

export function CompletedTaskGroup({ tasks, show, onToggle, onClearAll }) {
  if (!tasks.length) return null

  return (
    <div className="task-group task-group--completed">
      <button onClick={onToggle} className="task-group__toggle">
        <span className="task-group__icon">✅</span>
        <h3 className="task-group__title" style={{ color: 'var(--color-text-secondary)' }}>
          Completed ({tasks.length})
        </h3>
        <span className="task-group__toggle-arrow">{show ? '▼' : '▶'}</span>
      </button>
      {show && (
        <div style={{ marginTop: 'var(--space-md)' }}>
          {tasks.map(task => <TaskItem key={task.id} task={task} />)}
          <button onClick={onClearAll} className="task-group__clear-btn">
            Clear all completed tasks
          </button>
        </div>
      )}
    </div>
  )
}
