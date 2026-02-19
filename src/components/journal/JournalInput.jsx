import { useJournal } from '../../context/JournalContext'
import './JournalInput.css'

export default function JournalInput() {
  const {
    showJournalTextInput, setShowJournalTextInput,
    journalTextInput, setJournalTextInput,
    addJournalEntry
  } = useJournal()

  const handleSave = () => {
    if (journalTextInput.trim()) {
      addJournalEntry(journalTextInput.trim(), false)
      setJournalTextInput('')
      setShowJournalTextInput(false)
    }
  }

  const handleCancel = () => {
    setJournalTextInput('')
    setShowJournalTextInput(false)
  }

  return (
    <div className="journal-input">
      {showJournalTextInput ? (
        <div>
          <textarea
            value={journalTextInput}
            onChange={(e) => setJournalTextInput(e.target.value)}
            placeholder="Write your thoughts..."
            className="journal-input__textarea"
          />
          <div className="journal-input__actions">
            <button onClick={handleSave} className="journal-input__save">Save</button>
            <button onClick={handleCancel} className="journal-input__cancel">Cancel</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowJournalTextInput(true)} className="journal-input__trigger">
          + Add journal entry
        </button>
      )}
    </div>
  )
}
