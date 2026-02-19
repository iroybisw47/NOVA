import { useAuth } from '../../context/AuthContext'
import './IntegrationSettings.css'

export default function IntegrationSettings() {
  const { isSignedIn, login, logout } = useAuth()

  return (
    <div className="integration-settings">
      <div className="integration-settings__row">
        <div>
          <h3 className="integration-settings__title">Google Account</h3>
          <p className="integration-settings__desc">Calendar, Tasks, Gmail</p>
          {isSignedIn && <p className="integration-settings__status">● Connected</p>}
        </div>
        {isSignedIn ? (
          <button onClick={logout} className="integration-settings__disconnect">Disconnect</button>
        ) : (
          <button onClick={() => login()} className="integration-settings__connect">Connect</button>
        )}
      </div>
    </div>
  )
}
