import { createContext, useContext, useState, useEffect } from 'react'

const SettingsContext = createContext()

export function SettingsProvider({ children }) {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('nova_api_key') || '')
  const [tempApiKey, setTempApiKey] = useState('')
  const [showApiKey, setShowApiKey] = useState(false)
  const [settingsTab, setSettingsTab] = useState('account')
  const [newRule, setNewRule] = useState('')

  const [behavioralRules, setBehavioralRules] = useState(() => {
    try { return JSON.parse(localStorage.getItem('nova_behavioral_rules')) || [] } catch { return [] }
  })

  useEffect(() => { localStorage.setItem('nova_behavioral_rules', JSON.stringify(behavioralRules)) }, [behavioralRules])
  useEffect(() => { if (apiKey) localStorage.setItem('nova_api_key', apiKey) }, [apiKey])
  useEffect(() => { setTempApiKey(apiKey) }, [apiKey])

  const getApiKey = () => apiKey || import.meta.env.VITE_ANTHROPIC_API_KEY
  const addBehavioralRule = (rule) => setBehavioralRules([...behavioralRules, { id: Date.now(), rule }])
  const removeBehavioralRule = (ruleId) => setBehavioralRules(behavioralRules.filter(r => r.id !== ruleId))

  const saveApiKey = () => {
    setApiKey(tempApiKey)
    localStorage.setItem('nova_api_key', tempApiKey)
  }

  return (
    <SettingsContext.Provider value={{
      apiKey, setApiKey, tempApiKey, setTempApiKey, showApiKey, setShowApiKey,
      settingsTab, setSettingsTab, newRule, setNewRule,
      behavioralRules, setBehavioralRules, getApiKey,
      addBehavioralRule, removeBehavioralRule, saveApiKey
    }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider')
  return ctx
}
