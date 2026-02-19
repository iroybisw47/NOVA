import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage'

const WorkSessionContext = createContext()

const DEFAULT_CONFIG = {
  totalDurationMs: 1500000,    // 25 min
  breakDurationMs: 300000,     // 5 min
  breakIntervalMs: 1500000,    // 25 min (break every 25 min)
}

function createEmptySession() {
  return {
    id: String(Date.now()),
    status: 'idle',
    tasks: [],
    timerConfig: { ...DEFAULT_CONFIG },
    startedAt: null,
    elapsedWorkMs: 0,
    elapsedBreakMs: 0,
    breaksTaken: 0,
    currentIntervalElapsedMs: 0,
    breakElapsedMs: 0,
  }
}

// --- NL Timer Parser ---

function parseDuration(text) {
  let totalMs = 0
  const hourMatch = text.match(/(\d+(?:\.\d+)?)\s*h(?:ours?|rs?)?/i)
  const minMatch = text.match(/(\d+(?:\.\d+)?)\s*m(?:in(?:utes?)?)?/i)
  const secMatch = text.match(/(\d+(?:\.\d+)?)\s*s(?:ec(?:onds?)?)?/i)
  if (hourMatch) totalMs += parseFloat(hourMatch[1]) * 3600000
  if (minMatch) totalMs += parseFloat(minMatch[1]) * 60000
  if (secMatch) totalMs += parseFloat(secMatch[1]) * 1000
  if (!totalMs) {
    const bareNum = text.match(/^(\d+)$/)
    if (bareNum) totalMs = parseInt(bareNum[1]) * 60000
  }
  return totalMs
}

export function parseTimerInput(text) {
  if (!text || !text.trim()) return null
  const input = text.trim().toLowerCase()

  // Pomodoro shorthand: "pomodoro 25/5" or "pomodoro"
  const pomoMatch = input.match(/pomodoro(?:\s+(\d+)\s*\/\s*(\d+))?/)
  if (pomoMatch) {
    const focusMin = pomoMatch[1] ? parseInt(pomoMatch[1]) : 25
    const breakMin = pomoMatch[2] ? parseInt(pomoMatch[2]) : 5
    return {
      totalDurationMs: (focusMin + breakMin) * 4 * 60000 - breakMin * 60000,
      breakDurationMs: breakMin * 60000,
      breakIntervalMs: focusMin * 60000,
    }
  }

  // Focus blocks: "3 focus blocks of 25 min with 10 min breaks"
  const blocksMatch = input.match(/(\d+)\s*(?:focus\s*)?blocks?\s*(?:of\s*)?(\d+)\s*m(?:in)?(?:.*?(?:with|and)\s*(\d+)\s*m(?:in)?\s*breaks?)?/i)
  if (blocksMatch) {
    const blocks = parseInt(blocksMatch[1])
    const focusMin = parseInt(blocksMatch[2])
    const breakMin = blocksMatch[3] ? parseInt(blocksMatch[3]) : 5
    return {
      totalDurationMs: blocks * focusMin * 60000 + (blocks - 1) * breakMin * 60000,
      breakDurationMs: breakMin * 60000,
      breakIntervalMs: focusMin * 60000,
    }
  }

  // "no breaks" pattern
  if (/no\s*breaks?/i.test(input)) {
    const dur = parseDuration(input)
    if (dur) return { totalDurationMs: dur, breakDurationMs: 0, breakIntervalMs: 0 }
  }

  // "X with Y breaks every Z" pattern
  const fullMatch = input.match(/(.+?)(?:with|and)\s+(\d+)\s*m(?:in)?\s*breaks?\s*every\s+(.+)/i)
  if (fullMatch) {
    const total = parseDuration(fullMatch[1])
    const breakMs = parseInt(fullMatch[2]) * 60000
    const interval = parseDuration(fullMatch[3])
    if (total && interval) return { totalDurationMs: total, breakDurationMs: breakMs, breakIntervalMs: interval }
  }

  // "X with Y break halfway" pattern
  const halfwayMatch = input.match(/(.+?)(?:with|but\s*take)\s+(?:a\s+)?(\d+)\s*m(?:in)?\s*break\s*halfway/i)
  if (halfwayMatch) {
    const total = parseDuration(halfwayMatch[1])
    const breakMs = parseInt(halfwayMatch[2]) * 60000
    if (total) return { totalDurationMs: total, breakDurationMs: breakMs, breakIntervalMs: Math.round(total / 2) }
  }

  // Simple duration only
  const dur = parseDuration(input)
  if (dur) return { totalDurationMs: dur, breakDurationMs: DEFAULT_CONFIG.breakDurationMs, breakIntervalMs: DEFAULT_CONFIG.breakIntervalMs }

  return null
}

// --- Format helpers ---

export function formatMs(ms) {
  if (ms <= 0) return '0:00'
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

export function formatMsLong(ms) {
  if (ms <= 0) return '0m'
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  if (h > 0 && m > 0) return `${h}h ${m}m`
  if (h > 0) return `${h}h`
  return `${m}m`
}

// --- Provider ---

export function WorkSessionProvider({ children }) {
  const [sessions, setSessions] = useLocalStorage('nova_work_sessions', [])
  const [sessionDefaults, setSessionDefaults] = useLocalStorage('nova_session_defaults', DEFAULT_CONFIG)
  const [activeSession, setActiveSession] = useState(null)

  const timerRef = useRef(null)
  const lastTickRef = useRef(null)

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    lastTickRef.current = null
  }, [])

  // Timer tick effect
  useEffect(() => {
    if (!activeSession) { clearTimer(); return }

    if (activeSession.status === 'running') {
      if (!timerRef.current) {
        lastTickRef.current = Date.now()
        timerRef.current = setInterval(() => {
          const now = Date.now()
          const delta = now - lastTickRef.current
          lastTickRef.current = now

          setActiveSession(prev => {
            if (!prev || prev.status !== 'running') return prev
            const { timerConfig } = prev
            const newElapsedWork = prev.elapsedWorkMs + delta
            const newIntervalElapsed = prev.currentIntervalElapsedMs + delta

            // Check if total duration reached
            if (newElapsedWork >= timerConfig.totalDurationMs) {
              return { ...prev, status: 'completing', elapsedWorkMs: timerConfig.totalDurationMs, currentIntervalElapsedMs: newIntervalElapsed }
            }

            // Check if break interval reached
            if (timerConfig.breakIntervalMs > 0 && timerConfig.breakDurationMs > 0 && newIntervalElapsed >= timerConfig.breakIntervalMs) {
              return { ...prev, status: 'break', elapsedWorkMs: newElapsedWork, currentIntervalElapsedMs: 0, breakElapsedMs: 0, breaksTaken: prev.breaksTaken + 1 }
            }

            return { ...prev, elapsedWorkMs: newElapsedWork, currentIntervalElapsedMs: newIntervalElapsed }
          })
        }, 250)
      }
    } else if (activeSession.status === 'break') {
      if (!timerRef.current) {
        lastTickRef.current = Date.now()
        timerRef.current = setInterval(() => {
          const now = Date.now()
          const delta = now - lastTickRef.current
          lastTickRef.current = now

          setActiveSession(prev => {
            if (!prev || prev.status !== 'break') return prev
            const newBreakElapsed = prev.breakElapsedMs + delta
            const newTotalBreak = prev.elapsedBreakMs + delta

            if (newBreakElapsed >= prev.timerConfig.breakDurationMs) {
              return { ...prev, status: 'running', breakElapsedMs: 0, elapsedBreakMs: newTotalBreak }
            }

            return { ...prev, breakElapsedMs: newBreakElapsed, elapsedBreakMs: newTotalBreak }
          })
        }, 250)
      }
    } else {
      clearTimer()
    }

    return () => clearTimer()
  }, [activeSession?.status, clearTimer])

  // --- Actions ---

  const startNewSession = useCallback(() => {
    const session = createEmptySession()
    session.timerConfig = { ...sessionDefaults }
    session.status = 'setup'
    setActiveSession(session)
  }, [sessionDefaults])

  const updateTimerConfig = useCallback((config) => {
    setActiveSession(prev => prev ? { ...prev, timerConfig: { ...prev.timerConfig, ...config } } : prev)
  }, [])

  const saveDefaults = useCallback((config) => {
    setSessionDefaults(config)
  }, [setSessionDefaults])

  const addSessionTask = useCallback((title, source = 'session', googleTaskId = null) => {
    setActiveSession(prev => {
      if (!prev) return prev
      const task = { id: String(Date.now()), title, source, googleTaskId, status: 'pending' }
      return { ...prev, tasks: [...prev.tasks, task] }
    })
  }, [])

  const removeSessionTask = useCallback((taskId) => {
    setActiveSession(prev => {
      if (!prev) return prev
      return { ...prev, tasks: prev.tasks.filter(t => t.id !== taskId) }
    })
  }, [])

  const toggleSessionTaskStatus = useCallback((taskId, newStatus) => {
    setActiveSession(prev => {
      if (!prev) return prev
      return {
        ...prev,
        tasks: prev.tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t),
      }
    })
  }, [])

  const startSession = useCallback(() => {
    setActiveSession(prev => {
      if (!prev || prev.status !== 'setup') return prev
      return { ...prev, status: 'running', startedAt: new Date().toISOString() }
    })
  }, [])

  const pauseSession = useCallback(() => {
    clearTimer()
    setActiveSession(prev => {
      if (!prev || (prev.status !== 'running' && prev.status !== 'break')) return prev
      return { ...prev, status: 'paused' }
    })
  }, [clearTimer])

  const resumeSession = useCallback(() => {
    setActiveSession(prev => {
      if (!prev || prev.status !== 'paused') return prev
      return { ...prev, status: 'running' }
    })
  }, [])

  const skipBreak = useCallback(() => {
    setActiveSession(prev => {
      if (!prev || prev.status !== 'break') return prev
      return { ...prev, status: 'running', breakElapsedMs: 0, elapsedBreakMs: prev.elapsedBreakMs + (prev.timerConfig.breakDurationMs - prev.breakElapsedMs) }
    })
  }, [])

  const endSession = useCallback(() => {
    clearTimer()
    setActiveSession(prev => {
      if (!prev) return prev
      return { ...prev, status: 'completing' }
    })
  }, [clearTimer])

  const saveAndFinish = useCallback(() => {
    if (!activeSession) return
    const log = {
      id: activeSession.id,
      date: activeSession.startedAt ? new Date(activeSession.startedAt).toLocaleDateString() : new Date().toLocaleDateString(),
      startTime: activeSession.startedAt || new Date().toISOString(),
      endTime: new Date().toISOString(),
      totalWorkMs: activeSession.elapsedWorkMs,
      totalBreakMs: activeSession.elapsedBreakMs,
      breaksTaken: activeSession.breaksTaken,
      timerConfig: activeSession.timerConfig,
      tasks: activeSession.tasks.map(t => ({ id: t.id, title: t.title, source: t.source, status: t.status })),
    }
    setSessions(prev => [log, ...prev])
    setActiveSession(null)
  }, [activeSession, setSessions])

  const cancelSession = useCallback(() => {
    clearTimer()
    setActiveSession(null)
  }, [clearTimer])

  const deleteSessionLog = useCallback((sessionId) => {
    setSessions(prev => prev.filter(s => s.id !== sessionId))
  }, [setSessions])

  const value = {
    activeSession,
    sessions,
    sessionDefaults,
    startNewSession,
    updateTimerConfig,
    saveDefaults,
    addSessionTask,
    removeSessionTask,
    toggleSessionTaskStatus,
    startSession,
    pauseSession,
    resumeSession,
    skipBreak,
    endSession,
    saveAndFinish,
    cancelSession,
    deleteSessionLog,
    parseTimerInput,
    formatMs,
    formatMsLong,
  }

  return (
    <WorkSessionContext.Provider value={value}>
      {children}
    </WorkSessionContext.Provider>
  )
}

export function useWorkSession() {
  const ctx = useContext(WorkSessionContext)
  if (!ctx) throw new Error('useWorkSession must be used within WorkSessionProvider')
  return ctx
}
