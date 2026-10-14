import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { register } from '../api'
import { useAuth } from '../context/AuthContext'
import './Register.css'

function Register() {
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    username: '',
    password: '',
    confirm: '',
  })
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { saveSession } = useAuth()
  const navigate = useNavigate()

  function handleChange(event) {
    setForm({ ...form, [event.target.name]: event.target.value })
  }

  function validate() {
    if (form.full_name.trim().length < 2) {
      return 'Inserisci nome e cognome.'
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim())) {
      return 'Inserisci un indirizzo email valido.'
    }
    if (!/^[A-Za-z0-9_.-]{3,30}$/.test(form.username)) {
      return "L'username deve avere da 3 a 30 caratteri: lettere, numeri, punto, trattino o underscore."
    }
    if (form.password.length < 8) {
      return 'La password deve avere almeno 8 caratteri.'
    }
    if (form.password.length > 72) {
      return 'La password può avere al massimo 72 caratteri.'
    }
    if (form.password !== form.confirm) {
      return 'Le due password non coincidono.'
    }
    return ''
  }

  async function handleSubmit(event) {
    event.preventDefault()

    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    setError('')
    setIsSubmitting(true)

    try {
      const data = await register({
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        username: form.username,
        password: form.password,
      })
      saveSession(data)
      navigate('/')
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="register-page">
      <form className="register-form" onSubmit={handleSubmit}>
        <h1>Crea il tuo account</h1>

        <label htmlFor="full_name">Nome e cognome</label>
        <input
          id="full_name"
          name="full_name"
          type="text"
          value={form.full_name}
          onChange={handleChange}
        />

        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          value={form.email}
          onChange={handleChange}
        />

        <label htmlFor="username">Username</label>
        <input
          id="username"
          name="username"
          type="text"
          value={form.username}
          onChange={handleChange}
        />

        <label htmlFor="password">Password (almeno 8 caratteri)</label>
        <input
          id="password"
          name="password"
          type="password"
          value={form.password}
          onChange={handleChange}
        />

        <label htmlFor="confirm">Ripeti la password</label>
        <input
          id="confirm"
          name="confirm"
          type="password"
          value={form.confirm}
          onChange={handleChange}
        />

        {error && <p className="register-error">{error}</p>}

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Registrazione in corso...' : 'Registrati'}
        </button>

        <p className="register-back">
          Hai già un account? <Link to="/">Torna alla Home</Link>
        </p>
      </form>
    </div>
  )
}

export default Register