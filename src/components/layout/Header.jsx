import { useAuth } from '../../context/AuthContext'
import { formatDate } from '../../context/CalendarContext'
import './Header.css'

export default function Header({ greeting }) {
  const { isSignedIn, login } = useAuth()

  return (
    <header className="header">
      <div className="header__info">
        <h1 className="header__greeting">{greeting}</h1>
        <p className="header__date">{formatDate(new Date())}</p>
      </div>
      {!isSignedIn && (
        <button onClick={() => login()} className="header__connect">
          Connect Google
        </button>
      )}
    </header>
  )
}
