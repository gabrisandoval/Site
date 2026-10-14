import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login } from '../api'
import { useAuth } from '../context/AuthContext'
import './Login.css'


function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const navigate = useNavigate()
  const { saveSession } = useAuth()

async function handleSubmit(event) {
  event.preventDefault()

  if (!username.trim() || !password) {
    setError('Inserisci username e password.')
    return
  }

  setError('')
  setIsSubmitting(true)

    try {
    const data = await login(username.trim(), password)
    saveSession(data)
    navigate('/dashboard')
    } catch (err) {
        setError(err.message)
    } finally {
        setIsSubmitting(false)
    }
}

  return (
    <div className="login-page">
      <form className="login-form" onSubmit={handleSubmit}>
        <h1>Area riservata</h1>

        <label htmlFor="username">Username</label>
        <input
          id="username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />

        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && <p className="login-error">{error}</p>}

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Accesso in corso...' : 'Accedi'}
        </button>
      </form>
    </div>
  )
}

export default Login