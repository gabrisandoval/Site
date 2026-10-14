import { createContext, useContext, useState } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('token'))
  const [user, setUser] = useState(() =>
    JSON.parse(localStorage.getItem('user') || 'null')
  )

  function saveSession(data) {
    const userData = { role: data.role, full_name: data.full_name }
    localStorage.setItem('token', data.access_token)
    localStorage.setItem('user', JSON.stringify(userData))
    setToken(data.access_token)
    setUser(userData)
  }

  function logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
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