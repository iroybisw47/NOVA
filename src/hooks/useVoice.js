import { useState, useRef } from 'react'
import { useChat } from '../context/ChatContext'
import { useCalendar, formatDate, eventIsOnDate, isHolidayEvent, isCanvasAllDayEvent } from '../context/CalendarContext'
import { useTasks, taskIsOnDate } from '../context/TaskContext'

export function useVoice() {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isNovaSpeaking, setIsNovaSpeaking] = useState(false)
  const [lastNovaMessage, setLastNovaMessage] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')

  const { processCommand, setStatusMessage } = useChat()
  const { calendarEvents, allEvents, getHolidaysForDate } = useCalendar()
  const { googleTasks } = useTasks()

  const recognitionRef = useRef(null)

  const getGreeting = () => {
    const h = new Date().getHours()
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
  }

  const stopSpeaking = () => {
    window.speechSynthesis.cancel()
    setIsSpeaking(false)
    setIsNovaSpeaking(false)
  }

  const speakText = (text, isNova = false, expectsResponse = false) => {
    const utterance = new SpeechSynthesisUtterance(text)
    const voices = window.speechSynthesis.getVoices()
    const preferredVoice = voices.find(v => v.name === 'Google UK English Male')
    if (preferredVoice) utterance.voice = preferredVoice
    utterance.rate = 1.0
    utterance.pitch = 0.6
    utterance.onend = () => {
      if (isNova) setIsNovaSpeaking(false)
      if (expectsResponse) setTimeout(() => startListening(), 300)
    }
    if (isNova) {
      setIsNovaSpeaking(true)
      setLastNovaMessage(text)
    }
    window.speechSynthesis.speak(utterance)
  }

  const todayEvents = calendarEvents.filter(e => eventIsOnDate(e, new Date()))

  const speakBriefing = () => {
    if (isSpeaking) { stopSpeaking(); return }
    const today = new Date()
    const holidays = getHolidaysForDate(today)
    let briefing = `${getGreeting()}. Today is ${formatDate(today)}. `
    if (holidays.length) briefing += `Today is ${holidays.join(' and ')}. `
    if (todayEvents.length) {
      briefing += `You have ${todayEvents.length} event${todayEvents.length > 1 ? 's' : ''}. `
      todayEvents.forEach(e => {
        if (e.start.dateTime) {
          const start = new Date(e.start.dateTime)
          const end = new Date(e.end.dateTime)
          briefing += `${e.summary} from ${start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })} to ${end.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}. `
        } else {
          briefing += `${e.summary}, all day. `
        }
      })
    } else {
      briefing += 'No events scheduled. '
    }
    const pendingTasks = googleTasks.filter(t => t.status !== 'completed')
    if (pendingTasks.length) briefing += `${pendingTasks.length} task${pendingTasks.length > 1 ? 's' : ''} pending. `

    setIsSpeaking(true)
    setLastNovaMessage(briefing)
    const utterance = new SpeechSynthesisUtterance(briefing)
    const voices = window.speechSynthesis.getVoices()
    const preferredVoice = voices.find(v => v.name === 'Google UK English Male')
    if (preferredVoice) utterance.voice = preferredVoice
    utterance.rate = 1.0
    utterance.pitch = 0.6
    utterance.onend = () => setIsSpeaking(false)
    window.speechSynthesis.speak(utterance)
  }

  const startListening = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setStatusMessage('Voice not supported in this browser')
      return
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    recognitionRef.current = recognition
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'
    let finalTranscript = ''
    let silenceTimer = null

    recognition.onstart = () => {
      setIsListening(true)
      setInterimTranscript('')
      finalTranscript = ''
    }

    recognition.onresult = (event) => {
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) finalTranscript += transcript + ' '
        else interim += transcript
      }
      setInterimTranscript(interim)
      setStatusMessage(`"${(finalTranscript + interim).trim()}"`)
      if (silenceTimer) clearTimeout(silenceTimer)
      silenceTimer = setTimeout(() => { if (finalTranscript.trim()) recognition.stop() }, 2000)
    }

    recognition.onerror = (event) => {
      setIsListening(false)
      setInterimTranscript('')
      if (event.error === 'aborted' && finalTranscript.trim()) processVoiceCommand(finalTranscript.trim())
    }

    recognition.onend = () => {
      setIsListening(false)
      setInterimTranscript('')
      if (silenceTimer) clearTimeout(silenceTimer)
      if (finalTranscript.trim()) processVoiceCommand(finalTranscript.trim())
    }

    recognition.start()
  }

  const stopListening = () => { if (recognitionRef.current) recognitionRef.current.stop() }
  const interruptAndReply = () => { stopSpeaking(); setTimeout(() => startListening(), 100) }

  const processVoiceCommand = async (spokenText) => {
    setStatusMessage('Processing...')
    const result = await processCommand(spokenText)
    setStatusMessage(result.success ? `${result.message}` : result.message)
    speakText(result.message, true, result.expectsResponse)
  }

  return {
    isSpeaking, isListening, isNovaSpeaking, lastNovaMessage,
    interimTranscript, speakBriefing, startListening, stopListening,
    stopSpeaking, interruptAndReply, speakText, getGreeting
  }
}
