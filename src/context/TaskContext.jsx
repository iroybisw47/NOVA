import { createContext, useContext, useState } from 'react'
import { useAuth } from './AuthContext'
import { parseLocalDate, parseTaskDueDate, getDateString, toTaskDueDate, isSameDay, isToday } from './CalendarContext'

const TaskContext = createContext()

export const parseTaskNotes = (notes) => {
  if (!notes) return { type: 'due', priority: 'medium', description: '' }
  const typeMatch = notes.match(/\[TYPE:(general|due)\]/)
  const priorityMatch = notes.match(/\[PRIORITY:(urgent|high|medium|low)\]/)
  let description = notes.replace(/\[TYPE:(general|due)\]/, '').replace(/\[PRIORITY:(urgent|high|medium|low)\]/, '').replace(/\[TIME:[^\]]+\]/, '').trim()
  return { type: typeMatch ? typeMatch[1] : 'due', priority: priorityMatch ? priorityMatch[1] : 'medium', description }
}

export const buildTaskNotes = (type, priority, time, description) => {
  let notes = ''
  if (type) notes += `[TYPE:${type}]`
  if (priority) notes += `[PRIORITY:${priority}]`
  if (time) notes += `[TIME:${time}]`
  if (description) notes += description
  return notes
}

export const getTaskUrgencyColor = (task) => {
  const { type, priority } = parseTaskNotes(task.notes)
  if (priority === 'urgent') return { bg: '#fdf2f8', border: '#9333ea', text: '#7c3aed', label: 'Urgent', isUrgent: true }
  if (type === 'general') return { bg: '#f0fdf4', border: '#22c55e', text: '#16a34a', label: 'General' }
  if (!task.due) return { bg: '#f0fdf4', border: '#22c55e', text: '#16a34a', label: 'No due date' }
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const dueDate = parseTaskDueDate(task.due)
  if (!dueDate) return { bg: '#f0fdf4', border: '#22c55e', text: '#16a34a', label: 'No due date' }
  dueDate.setHours(0, 0, 0, 0)
  const daysUntilDue = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24))
  if (daysUntilDue < 0) return { bg: '#fef2f2', border: '#dc2626', text: '#b91c1c', label: 'Overdue', isOverdue: true }
  if (daysUntilDue <= 1) return { bg: '#fef2f2', border: '#ef4444', text: '#dc2626', label: daysUntilDue === 0 ? 'Due today' : 'Due tomorrow' }
  if (daysUntilDue <= 3) return { bg: '#fff7ed', border: '#f97316', text: '#ea580c', label: `Due in ${daysUntilDue} days` }
  if (daysUntilDue <= 7) return { bg: '#fffbeb', border: '#f59e0b', text: '#d97706', label: `Due in ${daysUntilDue} days` }
  return { bg: '#f0fdf4', border: '#22c55e', text: '#16a34a', label: `Due in ${daysUntilDue} days` }
}

export const categorizeTask = (task) => {
  if (task.status === 'completed') return 'completed'
  const { type, priority } = parseTaskNotes(task.notes)
  if (priority === 'urgent') return 'urgent'
  if (type === 'general') return 'general'
  if (task.due) {
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    const dueDate = parseTaskDueDate(task.due)
    if (dueDate) {
      dueDate.setHours(0, 0, 0, 0)
      if (dueDate < now) return 'overdue'
    }
  }
  return 'due'
}

export const getPriorityColor = (priority) => {
  switch (priority) {
    case 'urgent': return { bg: '#fdf2f8', border: '#9333ea', text: '#7c3aed' }
    case 'high': return { bg: '#fef2f2', border: '#ef4444', text: '#dc2626' }
    case 'medium': return { bg: '#fffbeb', border: '#f59e0b', text: '#d97706' }
    case 'low': return { bg: '#f0fdf4', border: '#22c55e', text: '#16a34a' }
    default: return { bg: '#f9fafb', border: '#9ca3af', text: '#6b7280' }
  }
}

export const taskIsOnDate = (task, targetDate) => {
  if (!task.due) return isToday(targetDate)
  const dueDate = parseTaskDueDate(task.due)
  return dueDate ? isSameDay(dueDate, targetDate) : isToday(targetDate)
}

export function TaskProvider({ children }) {
  const { accessToken } = useAuth()
  const [googleTasks, setGoogleTasks] = useState([])
  const [taskListId, setTaskListId] = useState(null)
  const [showCompletedTasks, setShowCompletedTasks] = useState(false)

  const getTaskList = async (token) => {
    try {
      const r = await fetch('https://tasks.googleapis.com/tasks/v1/users/@me/lists', { headers: { Authorization: `Bearer ${token}` } })
      return (await r.json()).items?.[0]?.id || null
    } catch (e) { return null }
  }

  const fetchGoogleTasks = async (token, listId) => {
    if (!listId) return []
    try {
      const r = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${listId}/tasks?showCompleted=true&showHidden=true&maxResults=100`, { headers: { Authorization: `Bearer ${token}` } })
      return (await r.json()).items || []
    } catch (e) { return [] }
  }

  const refreshTasks = async () => {
    const token = accessToken
    if (token && taskListId) setGoogleTasks(await fetchGoogleTasks(token, taskListId))
  }

  const addGoogleTask = async (title, dueDate = null, type = 'due', description = '', priority = null) => {
    if (!taskListId || !accessToken) return { success: false }
    const body = { title, status: 'needsAction', notes: buildTaskNotes(type, priority, null, description) }
    if (type === 'due' && dueDate) body.due = toTaskDueDate(dueDate)
    else if (type === 'due' && !dueDate) body.due = toTaskDueDate(getDateString(new Date()))
    try {
      const r = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks`, {
        method: 'POST', headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (r.ok) { await refreshTasks(); return { success: true } }
      return { success: false }
    } catch (e) { return { success: false } }
  }

  const updateGoogleTask = async (taskId, updates) => {
    if (!taskListId || !accessToken) return { success: false }
    try {
      const getR = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks/${taskId}`, { headers: { Authorization: `Bearer ${accessToken}` } })
      if (!getR.ok) return { success: false }
      const task = await getR.json()
      if (updates.title) task.title = updates.title
      if (updates.dueDate !== undefined) task.due = updates.dueDate ? toTaskDueDate(updates.dueDate) : null
      const currentNotes = parseTaskNotes(task.notes)
      const newType = updates.type !== undefined ? updates.type : currentNotes.type
      const newDescription = updates.description !== undefined ? updates.description : currentNotes.description
      task.notes = buildTaskNotes(newType, null, null, newDescription)
      const r = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks/${taskId}`, {
        method: 'PUT', headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify(task) })
      if (r.ok) { await refreshTasks(); return { success: true } }
      return { success: false }
    } catch (e) { return { success: false } }
  }

  const completeTask = async (taskId) => {
    if (!taskListId || !accessToken) return { success: false }
    try {
      const getR = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks/${taskId}`, { headers: { Authorization: `Bearer ${accessToken}` } })
      if (!getR.ok) return { success: false }
      const task = await getR.json()
      task.status = 'completed'
      const r = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks/${taskId}`, { method: 'PUT', headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify(task) })
      if (r.ok) { await refreshTasks(); return { success: true } }
      return { success: false }
    } catch (e) { return { success: false } }
  }

  const uncompleteTask = async (taskId) => {
    if (!taskListId || !accessToken) return { success: false }
    try {
      const getR = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks/${taskId}`, { headers: { Authorization: `Bearer ${accessToken}` } })
      if (!getR.ok) return { success: false }
      const task = await getR.json()
      task.status = 'needsAction'
      task.completed = null
      const r = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks/${taskId}`, { method: 'PUT', headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify(task) })
      if (r.ok) { await refreshTasks(); return { success: true } }
      return { success: false }
    } catch (e) { return { success: false } }
  }

  const deleteGoogleTask = async (taskId) => {
    if (!taskListId || !accessToken) return { success: false }
    try {
      const r = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks/${taskId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` } })
      if (r.ok) { await refreshTasks(); return { success: true } }
      return { success: false }
    } catch (e) { return { success: false } }
  }

  const bulkDeleteTasks = async (taskIds) => {
    if (!taskListId || !accessToken) return { success: false, deleted: 0 }
    let deleted = 0
    for (const taskId of taskIds) {
      try {
        const r = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks/${taskId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` } })
        if (r.ok) deleted++
      } catch (e) { console.error('Error deleting task:', e) }
    }
    await refreshTasks()
    return { success: deleted > 0, deleted }
  }

  const deleteDuplicateTasks = async () => {
    if (!taskListId || !accessToken) return { success: false, deleted: 0 }
    const tasks = await fetchGoogleTasks(accessToken, taskListId)
    const seen = new Map()
    const duplicateIds = []
    for (const task of tasks) {
      const dueDate = task.due ? task.due.split('T')[0] : 'no-due'
      const key = `${task.title}|${dueDate}`
      if (seen.has(key)) duplicateIds.push(task.id)
      else seen.set(key, task.id)
    }
    if (duplicateIds.length === 0) return { success: true, deleted: 0, message: 'No duplicate tasks found.' }
    let deleted = 0
    for (const taskId of duplicateIds) {
      try {
        const r = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks/${taskId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` } })
        if (r.ok) deleted++
      } catch (e) { console.error('Error deleting duplicate task:', e) }
    }
    await refreshTasks()
    return { success: true, deleted, message: `Deleted ${deleted} duplicate task${deleted !== 1 ? 's' : ''}.` }
  }

  const findTaskByFuzzyMatch = (searchText, includeCompleted = false) => {
    const search = searchText.toLowerCase()
    const words = search.split(/\s+/).filter(w => w.length > 1)
    const tasksToSearch = includeCompleted ? googleTasks : googleTasks.filter(t => t.status !== 'completed')
    let task = tasksToSearch.find(t => t.title.toLowerCase() === search)
    if (task) return { task, confidence: 'exact' }
    task = tasksToSearch.find(t => t.title.toLowerCase().includes(search))
    if (task) return { task, confidence: 'high' }
    task = tasksToSearch.find(t => search.includes(t.title.toLowerCase()))
    if (task) return { task, confidence: 'high' }
    const levenshtein = (a, b) => {
      const m = a.length, n = b.length
      const dp = Array.from({ length: m + 1 }, (_, i) => Array.from({ length: n + 1 }, (_, j) => i || j))
      for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++)
        dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1])
      return dp[m][n]
    }
    const wordSimilar = (w1, w2) => {
      if (w1.includes(w2) || w2.includes(w1)) return true
      const maxLen = Math.max(w1.length, w2.length)
      if (maxLen <= 2) return w1 === w2
      return levenshtein(w1, w2) / maxLen <= 0.3
    }
    const matches = tasksToSearch.map(t => {
      const titleWords = t.title.toLowerCase().split(/\s+/)
      const overlap = words.filter(w => titleWords.some(tw => wordSimilar(w, tw)))
      return { task: t, score: overlap.length / Math.max(words.length, titleWords.length) }
    }).filter(m => m.score > 0.3).sort((a, b) => b.score - a.score)
    if (matches.length === 1 && matches[0].score > 0.5) return { task: matches[0].task, confidence: 'high' }
    if (matches.length === 1) return { task: matches[0].task, confidence: 'medium' }
    if (matches.length > 1 && matches[0].score > matches[1].score + 0.2) return { task: matches[0].task, confidence: 'high' }
    if (matches.length > 1) return { task: null, confidence: 'ambiguous', candidates: matches.slice(0, 3).map(m => m.task.title) }
    return { task: null, confidence: 'none' }
  }

  const queryTasks = (filter = 'all') => {
    const incompleteTasks = googleTasks.filter(t => t.status !== 'completed')
    const completedTasks = googleTasks.filter(t => t.status === 'completed')
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    let filteredTasks = [], filterLabel = ''
    switch (filter.toLowerCase()) {
      case 'general': filteredTasks = incompleteTasks.filter(t => parseTaskNotes(t.notes).type === 'general'); filterLabel = 'general'; break
      case 'due': filteredTasks = incompleteTasks.filter(t => { const { type } = parseTaskNotes(t.notes); if (type !== 'due' || !t.due) return false; const dueDate = parseTaskDueDate(t.due); if (!dueDate) return false; dueDate.setHours(0,0,0,0); return dueDate >= today }); filterLabel = 'due'; break
      case 'overdue': filteredTasks = incompleteTasks.filter(t => { const { type } = parseTaskNotes(t.notes); if (type === 'general' || !t.due) return false; const dueDate = parseTaskDueDate(t.due); if (!dueDate) return false; dueDate.setHours(0,0,0,0); return dueDate < today }); filterLabel = 'overdue'; break
      case 'today': filteredTasks = incompleteTasks.filter(t => taskIsOnDate(t, today)); filterLabel = "today's"; break
      case 'completed': filteredTasks = completedTasks; filterLabel = 'completed'; break
      default: filteredTasks = incompleteTasks; filterLabel = 'pending'
    }
    if (filteredTasks.length === 0) return { tasks: [], message: `You have no ${filterLabel} tasks.` }
    filteredTasks.sort((a, b) => {
      const { type: aType } = parseTaskNotes(a.notes); const { type: bType } = parseTaskNotes(b.notes)
      if (aType === 'general' && bType !== 'general') return 1
      if (bType === 'general' && aType !== 'general') return -1
      if (a.due && b.due) { const aDate = parseTaskDueDate(a.due); const bDate = parseTaskDueDate(b.due); return (aDate || 0) - (bDate || 0) }
      if (a.due) return -1; if (b.due) return 1; return 0
    })
    const taskList = filteredTasks.map(t => {
      const { type, description } = parseTaskNotes(t.notes)
      const urgency = getTaskUrgencyColor(t)
      const dueStr = t.due ? ` (${urgency.label})` : ''
      const descStr = description ? ` - ${description.substring(0, 30)}${description.length > 30 ? '...' : ''}` : ''
      return `${t.title}${dueStr}${descStr}`
    }).join('\n')
    return { tasks: filteredTasks, message: `You have ${filteredTasks.length} ${filterLabel} task${filteredTasks.length > 1 ? 's' : ''}:\n\n${taskList}` }
  }

  const convertCanvasEventsToTasks = async (token, listId, events) => {
    if (!token || !listId) return
    const currentTasks = await fetchGoogleTasks(token, listId)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const canvasAllDayEvents = events.filter(e => {
      const calName = (e.calendarName || '').toLowerCase()
      const isCanvas = calName.includes('canvas') || calName.includes('instructure')
      const isAllDay = e.start.date && !e.start.dateTime
      return isCanvas && isAllDay
    })
    if (canvasAllDayEvents.length === 0) return
    let convertedCount = 0
    for (const event of canvasAllDayEvents) {
      try {
        const dueDate = event.start.date
        const dueDateObj = parseLocalDate(dueDate)
        dueDateObj.setHours(0, 0, 0, 0)
        if (dueDateObj < today) continue
        const isDuplicate = currentTasks.some(task => {
          if (task.title !== event.summary) return false
          if (!task.due) return false
          const taskDueDate = parseTaskDueDate(task.due)
          if (!taskDueDate) return false
          taskDueDate.setHours(0, 0, 0, 0)
          return taskDueDate.getTime() === dueDateObj.getTime()
        })
        if (isDuplicate) continue
        const taskBody = {
          title: event.summary, status: 'needsAction',
          notes: buildTaskNotes('due', null, null, 'Imported from Canvas'),
          due: toTaskDueDate(dueDate)
        }
        const taskResponse = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${listId}/tasks`, {
          method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(taskBody)
        })
        if (taskResponse.ok) convertedCount++
      } catch (e) { console.error(`Failed to convert event: ${event.summary}`, e) }
    }
    if (convertedCount > 0) {
      const updatedTasks = await fetchGoogleTasks(token, listId)
      setGoogleTasks(updatedTasks)
    }
  }

  const initialize = async (token) => {
    const listId = await getTaskList(token)
    setTaskListId(listId)
    if (listId) {
      const tasks = await fetchGoogleTasks(token, listId)
      setGoogleTasks(tasks)
    }
    return listId
  }

  return (
    <TaskContext.Provider value={{
      googleTasks, setGoogleTasks, taskListId, setTaskListId,
      showCompletedTasks, setShowCompletedTasks,
      getTaskList, fetchGoogleTasks, refreshTasks,
      addGoogleTask, updateGoogleTask, completeTask, uncompleteTask,
      deleteGoogleTask, bulkDeleteTasks, deleteDuplicateTasks,
      findTaskByFuzzyMatch, queryTasks, convertCanvasEventsToTasks,
      initialize
    }}>
      {children}
    </TaskContext.Provider>
  )
}

export function useTasks() {
  const ctx = useContext(TaskContext)
  if (!ctx) throw new Error('useTasks must be used within TaskProvider')
  return ctx
}
