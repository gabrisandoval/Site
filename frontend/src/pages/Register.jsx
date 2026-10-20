import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { register } from '../api'
import { useAuth } from '../context/AuthContext'
import { previewUsername } from '../utils/username'
import { FISCAL_CODE_REGEX, todayISO } from '../utils/identity'
import { CITIZENSHIPS, OTHER_CITIZENSHIP } from '../utils/citizenships'
import './Register.css'

// Same rule as the backend: optional "+", then digits and spaces, 6 to 20 characters
const PHONE_REGEX = /^\+?[0-9 ]{6,20}$/

// Italian postal code (CAP): exactly 5 digits
const POSTAL_CODE_REGEX = /^[0-9]{5}$/

function Register() {
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    gender: '',
    birth_date: '',
    fiscal_code: '',
    address: '',
    city: '',
    postal_code: '',
    phone: '',
    citizenship: '',
    citizenship_other: '', // used only when "Altra cittadinanza" is chosen
    email: '',
    password: '',
    confirm: '',
  })
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  // After a successful registration we show the username the server assigned
  const [createdUsername, setCreatedUsername] = useState('')
  const { saveSession } = useAuth()
  const navigate = useNavigate()

  function handleChange(event) {
    setForm({ ...form, [event.target.name]: event.target.value })
  }

  function validate() {
    if (form.first_name.trim().length < 2) {
      return 'Inserisci il nome.'
    }
    if (form.last_name.trim().length < 2) {
      return 'Inserisci il cognome.'
    }
    if (!previewUsername(form.first_name, form.last_name)) {
      return 'Nome e cognome devono contenere delle lettere.'
    }
    if (!form.gender) {
      return 'Seleziona il sesso.'
    }
    if (!form.birth_date) {
      return 'Inserisci la data di nascita.'
    }
    if (form.birth_date > todayISO()) {
      return 'La data di nascita non può essere nel futuro.'
    }
    if (!FISCAL_CODE_REGEX.test(form.fiscal_code.trim().toUpperCase())) {
      return 'Il codice fiscale deve avere 16 caratteri tra lettere e cifre.'
    }
    if (form.address.trim().length < 5) {
      return 'Inserisci la via di residenza.'
    }
    if (form.city.trim().length < 2) {
      return 'Inserisci la città di residenza.'
    }
    if (!POSTAL_CODE_REGEX.test(form.postal_code.trim())) {
      return 'Il CAP deve avere 5 cifre.'
    }
    if (!PHONE_REGEX.test(form.phone.trim())) {
      return 'Inserisci un numero di telefono valido (solo cifre, spazi e un + iniziale).'
    }
    if (!form.citizenship) {
      return 'Scegli la cittadinanza dall\'elenco.'
    }
    if (form.citizenship === OTHER_CITIZENSHIP && form.citizenship_other.trim().length < 2) {
      return 'Scrivi la tua cittadinanza.'
    }
    // The email is optional: we check it only if the person typed something
    if (form.email.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim())) {
      return 'Inserisci un indirizzo email valido oppure lascia il campo vuoto.'
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
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        gender: form.gender,
        birth_date: form.birth_date,
        fiscal_code: form.fiscal_code.trim().toUpperCase(),
        address: form.address.trim(),
        city: form.city.trim(),
        postal_code: form.postal_code.trim(),
        phone: form.phone.trim(),
        citizenship:
          form.citizenship === OTHER_CITIZENSHIP
            ? form.citizenship_other.trim()
            : form.citizenship,
        // an empty email is not sent at all
        ...(form.email.trim() && { email: form.email.trim() }),
        password: form.password,
      })
      saveSession(data)
      setCreatedUsername(data.username)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Confirmation screen: the customer must know the username to log in next time
  if (createdUsername) {
    return (
      <div className="register-page">
        <div className="register-form">
          <h1>Account creato!</h1>
          <p>Per accedere in futuro userai questo username:</p>
          <p className="register-username">{createdUsername}</p>
          <button type="button" onClick={() => navigate('/')}>
            Vai alla Home
          </button>
        </div>
      </div>
    )
  }

  const username = previewUsername(form.first_name, form.last_name)

  return (
    <div className="register-page">
      <form className="register-form" onSubmit={handleSubmit}>
        <h1>Crea il tuo account</h1>

        <div className="register-row">
          <div>
            <label htmlFor="first_name">Nome</label>
            <input
              id="first_name"
              name="first_name"
              type="text"
              value={form.first_name}
              onChange={handleChange}
            />
          </div>
          <div>
            <label htmlFor="last_name">Cognome</label>
            <input
              id="last_name"
              name="last_name"
              type="text"
              value={form.last_name}
              onChange={handleChange}
            />
          </div>
        </div>

        <p className="register-hint">
          Username: <strong>{username || 'nome.cognome'}</strong> (viene creato in automatico)
        </p>

        <div className="register-row">
          <div>
            <label htmlFor="gender">Sesso</label>
            <select id="gender" name="gender" value={form.gender} onChange={handleChange}>
              <option value="">Seleziona...</option>
              <option value="M">Maschio</option>
              <option value="F">Femmina</option>
            </select>
          </div>
          <div>
            <label htmlFor="birth_date">Data di nascita</label>
            <input
              id="birth_date"
              name="birth_date"
              type="date"
              max={todayISO()}
              value={form.birth_date}
              onChange={handleChange}
            />
          </div>
        </div>

        <label htmlFor="fiscal_code">Codice fiscale</label>
        <input
          id="fiscal_code"
          name="fiscal_code"
          type="text"
          maxLength="16"
          className="register-upper"
          value={form.fiscal_code}
          onChange={handleChange}
        />

        <label htmlFor="address">Via di residenza</label>
        <input
          id="address"
          name="address"
          type="text"
          placeholder="Es. Via Roma 12"
          value={form.address}
          onChange={handleChange}
        />

        <label htmlFor="city">Città</label>
        <input
          id="city"
          name="city"
          type="text"
          placeholder="Es. Milano"
          value={form.city}
          onChange={handleChange}
        />

        <label htmlFor="postal_code">CAP</label>
        <input
          id="postal_code"
          name="postal_code"
          type="text"
          inputMode="numeric"
          maxLength="5"
          placeholder="Es. 20121"
          value={form.postal_code}
          onChange={handleChange}
        />

        <label htmlFor="phone">Numero di telefono</label>
        <input
          id="phone"
          name="phone"
          type="tel"
          placeholder="Es. +39 333 1234567"
          value={form.phone}
          onChange={handleChange}
        />

        <label htmlFor="citizenship">Cittadinanza</label>
        <select
          id="citizenship"
          name="citizenship"
          value={form.citizenship}
          onChange={handleChange}
        >
          <option value="">Seleziona...</option>
          {CITIZENSHIPS.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
          <option value={OTHER_CITIZENSHIP}>Altra cittadinanza...</option>
        </select>

        {form.citizenship === OTHER_CITIZENSHIP && (
          <>
            <label htmlFor="citizenship_other">Quale cittadinanza?</label>
            <input
              id="citizenship_other"
              name="citizenship_other"
              type="text"
              placeholder="Es. Cambogiana"
              value={form.citizenship_other}
              onChange={handleChange}
            />
          </>
        )}

        <label htmlFor="email">Email (facoltativa)</label>
        <input
          id="email"
          name="email"
          type="email"
          value={form.email}
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
