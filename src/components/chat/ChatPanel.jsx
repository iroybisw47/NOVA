import { useChat } from '../../context/ChatContext'
import { useVoice } from '../../hooks/useVoice'
import ChatMessage, { ChatWelcome, ChatTypingIndicator } from './ChatMessage'
import ChatInput from './ChatInput'
import './ChatPanel.css'

export default function ChatPanel() {
  const { chatMessages, isProcessing, statusMessage, chatEndRef } = useChat()
  const { isSpeaking, isListening, isNovaSpeaking, speakBriefing, startListening, stopListening, interruptAndReply } = useVoice()

  return (
    <div className="chat-panel">
      <div className="chat-panel__header">
        <h3 className="chat-panel__title">Nova Assistant</h3>
        <div className="chat-panel__actions">
          <button
            onClick={speakBriefing}
            className={`chat-panel__action-btn ${isSpeaking ? 'chat-panel__action-btn--briefing-active' : 'chat-panel__action-btn--briefing'}`}
          >
            {isSpeaking ? 'Stop' : 'Daily Briefing'}
          </button>
          <button
            onClick={isListening ? stopListening : startListening}
            className={`chat-panel__action-btn ${isListening ? 'chat-panel__action-btn--voice-active' : 'chat-panel__action-btn--voice'}`}
          >
            {isListening ? 'Listening...' : 'Talk to Nova'}
          </button>
          {isNovaSpeaking && (
            <button onClick={interruptAndReply} className="chat-panel__action-btn chat-panel__action-btn--reply">
              Reply
            </button>
          )}
        </div>
      </div>

      {statusMessage && <div className="chat-panel__status">{statusMessage}</div>}

      <div className="chat-panel__messages">
        {chatMessages.length === 0 && <ChatWelcome />}
        {chatMessages.map((msg, i) => (
          <ChatMessage key={i} message={msg} />
        ))}
        {isProcessing && <ChatTypingIndicator />}
        <div ref={chatEndRef} />
      </div>

      <ChatInput />
    </div>
  )
}
