import { useState, useEffect } from 'react'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import { SettingsProvider } from './context/SettingsContext'
import { CalendarProvider, useCalendar } from './context/CalendarContext'
import { TaskProvider, useTasks } from './context/TaskContext'
import { JournalProvider } from './context/JournalContext'
import { WorkSessionProvider } from './context/WorkSessionContext'
import { ChatProvider } from './context/ChatContext'
import { useVoice } from './hooks/useVoice'
import MainLayout from './components/layout/MainLayout'
import Sidebar from './components/layout/Sidebar'
import Header from './components/layout/Header'
import LoadingSpinner from './components/shared/LoadingSpinner'
import LoginScreen from './components/auth/LoginScreen'
import DashboardView from './components/dashboard/DashboardView'
import CalendarView from './components/calendar/CalendarView'
import TasksView from './components/tasks/TasksView'
import JournalView from './components/journal/JournalView'
import SettingsView from './components/settings/SettingsView'
import WorkSessionsView from './components/work-sessions/WorkSessionsView'

function NovaApp() {
  const { accessToken, isSignedIn, isLoading, setLoading, needsInit, setNeedsInit } = useAuth()
  const { initialize: initCalendar, loadEvents } = useCalendar()
  const { initialize: initTasks } = useTasks()
  const { getGreeting } = useVoice()
  const [currentTab, setCurrentTab] = useState('dashboard')

  useEffect(() => {
    if (!accessToken || !needsInit) return
    const init = async () => {
      try {
        const { calendars } = await initCalendar(accessToken)
        await initTasks(accessToken)
        if (calendars && calendars.length) {
          await loadEvents(accessToken, calendars, new Date())
        }
      } catch (e) {
        console.error('Initialization error:', e)
      }
      setNeedsInit(false)
      setLoading(false)
    }
    init()
  }, [accessToken, needsInit])

  if (!isSignedIn) {
    return (
      <MainLayout>
        <LoginScreen />
      </MainLayout>
    )
  }

  if (isLoading) {
    return (
      <MainLayout>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
          <div style={{ textAlign: 'center' }}>
            <LoadingSpinner size="lg" />
            <p style={{ color: 'var(--color-text-secondary)', marginTop: '16px' }}>Loading Nova...</p>
          </div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <Sidebar currentTab={currentTab} onTabChange={setCurrentTab} />
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Header greeting={getGreeting()} />
        <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-2xl)' }}>
          {currentTab === 'dashboard' && <DashboardView />}
          {currentTab === 'calendar' && <CalendarView />}
          {currentTab === 'tasks' && <TasksView />}
          {currentTab === 'sessions' && <WorkSessionsView />}
          {currentTab === 'journal' && <JournalView />}
          {currentTab === 'settings' && <SettingsView />}
        </div>
      </main>
    </MainLayout>
  )
}

export default function App() {
  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      <ThemeProvider>
        <AuthProvider>
          <SettingsProvider>
              <CalendarProvider>
                <TaskProvider>
                  <WorkSessionProvider>
                    <JournalProvider>
                      <ChatProvider>
                        <NovaApp />
                      </ChatProvider>
                    </JournalProvider>
                  </WorkSessionProvider>
                </TaskProvider>
              </CalendarProvider>
            </SettingsProvider>
        </AuthProvider>
      </ThemeProvider>
    </GoogleOAuthProvider>
  )
}
