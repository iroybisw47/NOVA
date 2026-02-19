import { useState } from 'react'
import { useWorkSession } from '../../context/WorkSessionContext'
import SessionHome from './SessionHome'
import SessionSetup from './SessionSetup'
import SessionActive from './SessionActive'
import SessionCompleting from './SessionCompleting'
import SessionDetail from './SessionDetail'
import './WorkSessionsView.css'

export default function WorkSessionsView() {
  const { activeSession, startNewSession } = useWorkSession()
  const [detailId, setDetailId] = useState(null)

  // Active session sub-views take priority
  if (activeSession) {
    if (activeSession.status === 'setup') return <SessionSetup />
    if (activeSession.status === 'completing') return <SessionCompleting />
    // running, paused, break
    return <SessionActive />
  }

  // Detail view
  if (detailId) {
    return <SessionDetail sessionId={detailId} onBack={() => setDetailId(null)} />
  }

  // Home
  return (
    <SessionHome
      onStartNew={startNewSession}
      onViewDetail={(id) => setDetailId(id)}
    />
  )
}
