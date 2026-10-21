import { createContext, useContext, useState } from 'react'

const AuthContext = createContext(null)

// The login is kept in sessionStorage: it survives a page refresh, but it ends when
// the browser tab/window is closed. So opening the site again always starts from the
// Home page with nobody logged in.
const storage = window.sessionStorage

// Old versions of the site kept the login in localStorage (it never expired by itself):
// remove it, otherwise the old admin login would still be there.
localStorage.removeItem('token')
localStorage.removeItem('user')

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => storage.getItem('token'))
  const [user, setUser] = useState(() =>
    JSON.parse(storage.getItem('user') || 'null')
  )

  function saveSession(data) {
    const userData = { role: data.role, full_name: data.full_name }
    storage.setItem('token', data.access_token)
    storage.setItem('user', JSON.stringify(userData))
    setToken(data.access_token)
    setUser(userData)
  }

  function logout() {
    storage.removeItem('token')
    storage.removeItem('user')
    setToken(null)
    setUser(null)
  }

  const value = {
    token,
    user,
    isAuthenticated: Boolean(token),
    saveSession,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}