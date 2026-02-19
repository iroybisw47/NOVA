import { useChat } from '../../context/ChatContext'
import './ChatInput.css'

export default function ChatInput() {
  const { chatInput, setChatInput, handleChatSubmit } = useChat()

  return (
    <form onSubmit={handleChatSubmit} className="chat-input">
      <input
        type="text"
        value={chatInput}
        onChange={(e) => setChatInput(e.target.value)}
        placeholder="Type a message..."
        className="chat-input__field"
      />
      <button type="submit" className="chat-input__send">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
        </svg>
      </button>
    </form>
  )
}
