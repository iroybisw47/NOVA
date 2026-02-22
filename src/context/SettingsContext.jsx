import { createContext, useContext, useState, useEffect } from 'react'

const SettingsContext = createContext()

export function SettingsProvider({ children }) {
  const [settingsTab, setSettingsTab] = useState('integrations')
  const [newRule, setNewRule] = useState('')

  const [behavioralRules, setBehavioralRules] = useState(() => {
    try { return JSON.parse(localStorage.getItem('nova_behavioral_rules')) || [] } catch { return [] }
  })

  useEffect(() => { localStorage.setItem('nova_behavioral_rules', JSON.stringify(behavioralRules)) }, [behavioralRules])

  const addBehavioralRule = (rule) => setBehavioralRules([...behavioralRules, { id: Date.now(), rule }])
  const removeBehavioralRule = (ruleId) => setBehavioralRules(behavioralRules.filter(r => r.id !== ruleId))

  return (
    <SettingsContext.Provider value={{
      settingsTab, setSettingsTab, newRule, setNewRule,
      behavioralRules, setBehavioralRules,
      addBehavioralRule, removeBehavioralRule
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
