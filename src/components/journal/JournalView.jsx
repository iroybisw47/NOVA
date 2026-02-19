import { useJournal } from '../../context/JournalContext'
import { formatDate } from '../../context/CalendarContext'
import JournalInput from './JournalInput'
import JournalEntry, { JournalEmpty } from './JournalEntry'
import './JournalView.css'

export default function JournalView() {
  const {
    journalDate, navigateDay, goToToday, isJournalToday,
    getEntriesForDate, getDateKey
  } = useJournal()

  const entries = getEntriesForDate(journalDate)
  const dateKey = getDateKey(journalDate)

  return (
    <div className="journal-view">
      <div className="journal-view__nav">
        <button onClick={() => navigateDay(-1)} className="journal-view__nav-btn">
          ← Previous
        </button>
        <div className="journal-view__nav-center">
          <h2 className="journal-view__title">Journal</h2>
          <p className="journal-view__date">{formatDate(journalDate)}</p>
          {!isJournalToday && (
            <button onClick={goToToday} className="journal-view__today-btn">
              Go to Today
            </button>
          )}
        </div>
        <button onClick={() => navigateDay(1)} className="journal-view__nav-btn">
          Next →
        </button>
      </div>

      <JournalInput />

      {entries.length > 0
        ? entries.map(entry => (
            <JournalEntry key={entry.id} entry={entry} dateKey={dateKey} />
          ))
        : <JournalEmpty date={journalDate} />
      }
    </div>
  )
}
