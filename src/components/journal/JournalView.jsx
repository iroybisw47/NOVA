import { useState } from 'react'
import { useJournal } from '../../context/JournalContext'
import { formatDate, formatShortDate } from '../../context/CalendarContext'
import JournalInput from './JournalInput'
import JournalEntry from './JournalEntry'
import './JournalView.css'

export default function JournalView() {
  const {
    journalEntries, journalDate, setJournalDate,
    getEntriesForDate, getDateKey, goToToday
  } = useJournal()

  const [expandedDate, setExpandedDate] = useState(null)

  // Get all dates with entries, sorted newest first
  const allDates = Object.keys(journalEntries)
    .filter(key => journalEntries[key]?.length > 0)
    .sort((a, b) => b.localeCompare(a))

  const handleDateClick = (dateKey) => {
    if (expandedDate === dateKey) {
      setExpandedDate(null)
    } else {
      setExpandedDate(dateKey)
      // Set journal date to this date for adding entries
      const [y, m, d] = dateKey.split('-').map(Number)
      setJournalDate(new Date(y, m - 1, d))
    }
  }

  const handleNewEntry = () => {
    goToToday()
    const todayKey = getDateKey(new Date())
    setExpandedDate(todayKey)
  }

  const todayKey = getDateKey(new Date())
  const isTodayExpanded = expandedDate === todayKey

  return (
    <div className="journal-view">
      <div className="journal-view__header">
        <h2 className="journal-view__title">Journal</h2>
        <button className="journal-view__new-btn" onClick={handleNewEntry}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 4v16m8-8H4" /></svg>
          New Entry
        </button>
      </div>

      {isTodayExpanded && (
        <div className="journal-view__expanded">
          <div className="journal-view__expanded-header">
            <h3 className="journal-view__expanded-date">{formatDate(new Date())}</h3>
            <button className="journal-view__collapse-btn" onClick={() => setExpandedDate(null)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <JournalInput />
          {getEntriesForDate(new Date()).map(entry => (
            <JournalEntry key={entry.id} entry={entry} dateKey={todayKey} />
          ))}
        </div>
      )}

      {allDates.length === 0 && !isTodayExpanded ? (
        <div className="journal-view__empty">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.4">
            <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <p>No journal entries yet</p>
          <p className="journal-view__empty-sub">Start journaling to track your thoughts and reflections</p>
        </div>
      ) : (
        <div className="journal-view__list">
          {allDates.map(dateKey => {
            if (dateKey === todayKey && isTodayExpanded) return null
            const entries = journalEntries[dateKey]
            const [y, m, d] = dateKey.split('-').map(Number)
            const date = new Date(y, m - 1, d)
            const isExpanded = expandedDate === dateKey
            const isToday = dateKey === todayKey
            const preview = entries[entries.length - 1]?.content || ''

            return (
              <div key={dateKey}>
                <button
                  className={`journal-view__card ${isExpanded ? 'journal-view__card--expanded' : ''}`}
                  onClick={() => handleDateClick(dateKey)}
                >
                  <div className="journal-view__card-header">
                    <span className="journal-view__card-date">
                      {isToday ? 'Today' : formatShortDate(date)}
                    </span>
                    <span className="journal-view__card-count">
                      {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
                    </span>
                  </div>
                  {!isExpanded && (
                    <p className="journal-view__card-preview">
                      {preview.substring(0, 80)}{preview.length > 80 ? '...' : ''}
                    </p>
                  )}
                </button>

                {isExpanded && (
                  <div className="journal-view__expanded">
                    <JournalInput />
                    {entries.map(entry => (
                      <JournalEntry key={entry.id} entry={entry} dateKey={dateKey} />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
