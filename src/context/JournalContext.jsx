import { createContext, useContext, useState, useEffect } from 'react'
import { useAuth } from './AuthContext'
import { getDateString, isSameDay } from './CalendarContext'

const JournalContext = createContext()

export function JournalProvider({ children }) {
  const { userId } = useAuth()
  const [journalEntries, setJournalEntries] = useState({})
  const [journalDate, setJournalDate] = useState(new Date())
  const [isRecordingJournal, setIsRecordingJournal] = useState(false)
  const [journalTranscript, setJournalTranscript] = useState('')
  const [showJournalTextInput, setShowJournalTextInput] = useState(false)
  const [journalTextInput, setJournalTextInput] = useState('')
  const [editingJournalId, setEditingJournalId] = useState(null)

  useEffect(() => {
    if (userId) {
      try {
        const saved = localStorage.getItem(`nova_journal_${userId}`)
        setJournalEntries(saved ? JSON.parse(saved) : {})
      } catch { setJournalEntries({}) }
    }
  }, [userId])

  useEffect(() => {
    if (userId) localStorage.setItem(`nova_journal_${userId}`, JSON.stringify(journalEntries))
  }, [journalEntries, userId])

  const getDateKey = (date) => getDateString(date)

  const addJournalEntry = (content, isVoice = false) => {
    const dateKey = getDateKey(journalDate)
    const entry = { id: Date.now(), time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), content, isVoice }
    setJournalEntries(prev => ({ ...prev, [dateKey]: [...(prev[dateKey] || []), entry] }))
  }

  const deleteJournalEntry = (dateKey, entryId) => {
    setJournalEntries(prev => ({ ...prev, [dateKey]: prev[dateKey].filter(e => e.id !== entryId) }))
  }

  const getEntriesForDate = (date) => journalEntries[getDateKey(date)] || []

  const navigateDay = (offset) => {
    const d = new Date(journalDate)
    d.setDate(d.getDate() + offset)
    setJournalDate(d)
  }

  const goToToday = () => setJournalDate(new Date())
  const isJournalToday = isSameDay(journalDate, new Date())

  return (
    <JournalContext.Provider value={{
      journalEntries, journalDate, setJournalDate,
      isRecordingJournal, setIsRecordingJournal,
      journalTranscript, setJournalTranscript,
      showJournalTextInput, setShowJournalTextInput,
      journalTextInput, setJournalTextInput,
      editingJournalId, setEditingJournalId,
      addJournalEntry, deleteJournalEntry, getEntriesForDate,
      navigateDay, goToToday, isJournalToday, getDateKey
    }}>
      {children}
    </JournalContext.Provider>
  )
}

export function useJournal() {
  const ctx = useContext(JournalContext)
  if (!ctx) throw new Error('useJournal must be used within JournalProvider')
  return ctx
}
