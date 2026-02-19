import { useJournal } from '../../context/JournalContext'
import { formatDate } from '../../context/CalendarContext'
import './JournalEntry.css'

export default function JournalEntry({ entry, dateKey }) {
  const { deleteJournalEntry } = useJournal()

  return (
    <div className="journal-entry">
      <div className="journal-entry__header">
        <span className="journal-entry__time">
          {entry.time} {entry.isVoice && '🎤'}
        </span>
        <button
          onClick={() => deleteJournalEntry(dateKey, entry.id)}
          className="journal-entry__delete"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <p className="journal-entry__content">{entry.content}</p>
    </div>
  )
}

export function JournalEmpty({ date }) {
  return (
    <div className="journal-empty">
      <div className="journal-empty__icon">📖</div>
      <p className="journal-empty__text">No entries for {formatDate(date)}</p>
    </div>
  )
}
