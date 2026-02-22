import { useSettings } from '../../context/SettingsContext'
import IntegrationSettings from './IntegrationSettings'
import AIRulesSettings from './AIRulesSettings'
import './SettingsView.css'

const tabs = ['integrations', 'ai-rules']

export default function SettingsView() {
  const { settingsTab, setSettingsTab } = useSettings()

  return (
    <div className="settings-view">
      <h2 className="settings-view__title">Settings</h2>
      <div className="settings-view__tabs">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setSettingsTab(tab)}
            className={`settings-view__tab ${settingsTab === tab ? 'settings-view__tab--active' : ''}`}
          >
            {tab.replace('-', ' ')}
          </button>
        ))}
      </div>

      {settingsTab === 'integrations' && <IntegrationSettings />}
      {settingsTab === 'ai-rules' && <AIRulesSettings />}
    </div>
  )
}
