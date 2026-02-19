import { createContext, useContext, useState, useEffect } from 'react'
import { useGoogleLogin } from '@react-oauth/google'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [isSignedIn, setIsSignedIn] = useState(false)
  const [accessToken, setAccessToken] = useState(null)
  const [userId, setUserId] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [needsInit, setNeedsInit] = useState(false)

  const saveToken = (token, expiresIn) => {
    localStorage.setItem('nova_token', token)
    localStorage.setItem('nova_token_expires', (Date.now() + expiresIn * 1000).toString())
  }

  const getSavedToken = () => {
    const t = localStorage.getItem('nova_token')
    const e = localStorage.getItem('nova_token_expires')
    return t && e && Date.now() < parseInt(e) - 300000 ? t : null
  }

  const clearToken = () => {
    localStorage.removeItem('nova_token')
    localStorage.removeItem('nova_token_expires')
  }

  const login = useGoogleLogin({
    onSuccess: async (response) => {
      saveToken(response.access_token, response.expires_in || 3600)
      setAccessToken(response.access_token)
      setIsSignedIn(true)
      setIsLoading(true)
      setNeedsInit(true)
      try {
        const userInfoR = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', { headers: { Authorization: `Bearer ${response.access_token}` } })
        if (userInfoR.ok) {
          const userInfo = await userInfoR.json()
          setUserId(userInfo.id)
        }
      } catch (e) { console.error('Could not fetch user info:', e) }
    },
    scope: 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/tasks'
  })

  const logout = () => {
    clearToken()
    setIsSignedIn(false)
    setAccessToken(null)
    setUserId(null)
  }

  useEffect(() => {
    const token = getSavedToken()
    if (token) {
      setAccessToken(token)
      setIsSignedIn(true)
      setNeedsInit(true)
      fetch('https://www.googleapis.com/oauth2/v2/userinfo', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : null)
        .then(info => { if (info) setUserId(info.id) })
        .catch(() => {})
    } else {
      setIsLoading(false)
    }
  }, [])

  const setLoading = (val) => setIsLoading(val)

  return (
    <AuthContext.Provider value={{
      isSignedIn, accessToken, userId, isLoading, setLoading,
      needsInit, setNeedsInit,
      login, logout, saveToken, getSavedToken, clearToken
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
