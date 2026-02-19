import './ChatMessage.css'

function NovaAvatar() {
  return (
    <div className="chat-message__avatar">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
      </svg>
    </div>
  )
}

export default function ChatMessage({ message }) {
  const isUser = message.role === 'user'

  return (
    <div className={`chat-message ${isUser ? 'chat-message--user' : ''}`}>
      {!isUser && <NovaAvatar />}
      <div className={`chat-message__bubble chat-message__bubble--${message.role}`}>
        <p className="chat-message__text">{message.content}</p>
      </div>
    </div>
  )
}

export function ChatWelcome() {
  return (
    <div className="chat-message__welcome">
      <NovaAvatar />
      <div className="chat-message__bubble chat-message__bubble--assistant">
        <p className="chat-message__text">Hello! I'm Nova. How can I help you today?</p>
      </div>
    </div>
  )
}

export function ChatTypingIndicator() {
  return (
    <div className="chat-typing">
      <span className="chat-typing__dot" />
      <span className="chat-typing__dot" />
      <span className="chat-typing__dot" />
    </div>
  )
}
