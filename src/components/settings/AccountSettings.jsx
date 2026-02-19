import { useSettings } from '../../context/SettingsContext'
import './AccountSettings.css'

export default function AccountSettings() {
  const { apiKey, tempApiKey, setTempApiKey, showApiKey, setShowApiKey, saveApiKey } = useSettings()

  return (
    <div className="account-settings">
      <h3 className="account-settings__title">Anthropic API Key</h3>
      <p className="account-settings__desc">
        Required for AI features. Get your key from{' '}
        <a href="https://console.anthropic.com" target="_blank" rel="noreferrer">console.anthropic.com</a>
      </p>
      <div className="account-settings__input-row">
        <input
          type={showApiKey ? 'text' : 'password'}
          value={tempApiKey}
          onChange={(e) => setTempApiKey(e.target.value)}
          placeholder="sk-ant-api03-..."
          className="account-settings__input"
        />
        <button onClick={() => setShowApiKey(!showApiKey)} className="account-settings__toggle">
          {showApiKey ? '🙈' : '👁️'}
        </button>
      </div>
      <button onClick={saveApiKey} className="account-settings__save">Save API Key</button>
      {apiKey && <p className="account-settings__status">✓ API key saved</p>}
    </div>
  )
}
