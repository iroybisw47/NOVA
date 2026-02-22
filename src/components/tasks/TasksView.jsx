import { useTasks, parseTaskNotes } from '../../context/TaskContext'
import { parseTaskDueDate } from '../../context/CalendarContext'
import TaskGroup from './TaskGroup'
import { CompletedTaskGroup } from './TaskGroup'
import './TasksView.css'

export default function TasksView() {
  const { googleTasks, showCompletedTasks, setShowCompletedTasks, bulkDeleteTasks } = useTasks()

  const urgentTasks = googleTasks.filter(t => t.status !== 'completed' && parseTaskNotes(t.notes).priority === 'urgent')

  const generalTasks = googleTasks.filter(t => t.status !== 'completed' && parseTaskNotes(t.notes).type === 'general' && parseTaskNotes(t.notes).priority !== 'urgent')

  const dueTasks = googleTasks.filter(t => {
    if (t.status === 'completed') return false
    const { type, priority } = parseTaskNotes(t.notes)
    if (priority === 'urgent') return false
    if (type === 'general') return false
    if (!t.due) return true
    const dueDate = parseTaskDueDate(t.due)
    if (!dueDate) return true
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    dueDate.setHours(0, 0, 0, 0)
    return dueDate >= today
  }).sort((a, b) => {
    if (a.due && b.due) {
      const aDate = parseTaskDueDate(a.due)
      const bDate = parseTaskDueDate(b.due)
      return (aDate || 0) - (bDate || 0)
    }
    if (a.due) return -1
    return 1
  })

  const overdueTasks = googleTasks.filter(t => {
    if (t.status === 'completed') return false
    const { type, priority } = parseTaskNotes(t.notes)
    if (priority === 'urgent') return false
    if (type === 'general' || !t.due) return false
    const dueDate = parseTaskDueDate(t.due)
    if (!dueDate) return false
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    dueDate.setHours(0, 0, 0, 0)
    return dueDate < today
  })

  const completedTasks = googleTasks.filter(t => t.status === 'completed')
  const hasNoTasks = !urgentTasks.length && !generalTasks.length && !dueTasks.length && !overdueTasks.length

  return (
    <div className="tasks-view">
      <h2 className="tasks-view__title">Tasks</h2>

      <TaskGroup title="Urgent" icon="🟣" titleColor="#7c3aed" tasks={urgentTasks} />
      <TaskGroup title="Overdue" icon="🔴" titleColor="#dc2626" tasks={overdueTasks} />
      <TaskGroup title="Due Tasks" icon="📅" titleColor="var(--color-text)" tasks={dueTasks} />
      <TaskGroup title="General Tasks" icon="🟢" titleColor="#16a34a" tasks={generalTasks} />

      {hasNoTasks && <p className="tasks-view__empty">No pending tasks</p>}

      <CompletedTaskGroup
        tasks={completedTasks}
        show={showCompletedTasks}
        onToggle={() => setShowCompletedTasks(!showCompletedTasks)}
        onClearAll={() => bulkDeleteTasks(completedTasks.map(t => t.id))}
      />
    </div>
  )
}
