import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { register } from '../api'
import { useAuth } from '../context/AuthContext'
import { previewUsername } from '../utils/username'
import { FISCAL_CODE_REGEX, todayISO } from '../utils/identity'
import { CITIZENSHIPS, OTHER_CITIZENSHIP } from '../utils/citizenships'
import { sortServerError } from '../utils/serverErrors'
import FormErrors from '../components/FormErrors'
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
  // What is wrong: { fieldName: sentence } for the fields, plus sentences about no field
  const [fieldErrors, setFieldErrors] = useState({})
  const [generalErrors, setGeneralErrors] = useState([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  // After a successful registration we show the username the server assigned
  const [createdUsername, setCreatedUsername] = useState('')
  const { saveSession } = useAuth()
  const navigate = useNavigate()

  function handleChange(event) {
    const { name, value } = event.target
    setForm({ ...form, [name]: value })

    // The person is fixing this field: remove its red mark
    const errorKey = name === 'citizenship_other' ? 'citizenship' : name
    if (fieldErrors[errorKey]) {
      const { [errorKey]: _fixed, ...others } = fieldErrors
      setFieldErrors(others)
    }
  }

  // Check the whole form and return { fieldName: "what is wrong" } (empty = all good)
  function validate() {
    const problems = {}
    const fiscalCode = form.fiscal_code.trim().toUpperCase()

    if (form.first_name.trim().length < 2) problems.first_name = 'Nome: inserisci almeno 2 lettere.'
    else if (form.first_name.trim().length > 50) problems.first_name = 'Nome: troppo lungo (massimo 50 caratteri).'
    if (form.last_name.trim().length < 2) problems.last_name = 'Cognome: inserisci almeno 2 lettere.'
    else if (form.last_name.trim().length > 50) problems.last_name = 'Cognome: troppo lungo (massimo 50 caratteri).'
    if (!problems.first_name && !problems.last_name && !previewUsername(form.first_name, form.last_name)) {
      problems.first_name = 'Nome e cognome: devono contenere delle lettere.'
    }
    if (!form.gender) problems.gender = "Sesso: selezionalo dall'elenco."
    if (!form.birth_date) problems.birth_date = 'Data di nascita: mancante.'
    else if (form.birth_date > todayISO()) problems.birth_date = 'Data di nascita: non può essere nel futuro.'
    if (!fiscalCode) problems.fiscal_code = 'Codice fiscale: mancante.'
    else if (!FISCAL_CODE_REGEX.test(fiscalCode)) {
      problems.fiscal_code = `Codice fiscale: servono 16 caratteri tra lettere e cifre (ne hai scritti ${fiscalCode.length}).`
    }
    if (form.address.trim().length < 5) problems.address = 'Via di residenza: mancante o troppo corta (almeno 5 caratteri).'
    else if (form.address.trim().length > 150) problems.address = 'Via di residenza: troppo lunga (massimo 150 caratteri).'
    if (form.city.trim().length < 2) problems.city = 'Città: mancante.'
    if (!POSTAL_CODE_REGEX.test(form.postal_code.trim())) problems.postal_code = 'CAP: deve avere 5 cifre.'
    if (!form.phone.trim()) problems.phone = 'Telefono: mancante.'
    else if (!PHONE_REGEX.test(form.phone.trim())) {
      problems.phone = 'Telefono: usa solo cifre e spazi (un + iniziale è ammesso), da 6 a 20 caratteri.'
    }
    if (!form.citizenship) problems.citizenship = "Cittadinanza: scegli una voce dall'elenco."
    else if (form.citizenship === OTHER_CITIZENSHIP && form.citizenship_other.trim().length < 2) {
      problems.citizenship = 'Cittadinanza: scrivi la tua cittadinanza.'
    }
    // The email is optional: we check it only if the person typed something
    if (form.email.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim())) {
      problems.email = 'Email: indirizzo non valido (oppure lascia il campo vuoto).'
    }
    if (!form.password) problems.password = 'Password: mancante.'
    else if (form.password.length < 8) {
      problems.password = `Password: troppo corta (${form.password.length} caratteri, ne servono almeno 8).`
    } else if (new TextEncoder().encode(form.password).length > 72) {
      // The server counts bytes: accented letters and symbols take more than one
      problems.password = 'Password: troppo lunga (massimo 72 caratteri; lettere accentate e simboli ne contano di più).'
    }
    if (form.password && form.password !== form.confirm) {
      problems.confirm = 'Le due password non coincidono.'
    }
    return problems
  }

  async function handleSubmit(event) {
    event.preventDefault()

    const problems = validate()
    if (Object.keys(problems).length > 0) {
      setFieldErrors(problems)
      setGeneralErrors([])
      return
    }

    setFieldErrors({})
    setGeneralErrors([])
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
      // The server refused: show its sentences and mark the fields they are about
      const { marked, general } = sortServerError(err.message)
      setFieldErrors(marked)
      setGeneralErrors(general)
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
      <form className="register-form" onSubmit={handleSubmit} noValidate>
        <h1>Crea il tuo account</h1>

        <div className="register-row">
          <div>
            <label htmlFor="first_name">Nome</label>
            <input
              id="first_name"
              name="first_name"
          className={fieldErrors.first_name ? 'field-invalid' : undefined}
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
          className={fieldErrors.last_name ? 'field-invalid' : undefined}
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
            <select
              id="gender"
              name="gender"
              className={fieldErrors.gender ? 'field-invalid' : undefined}
              value={form.gender}
              onChange={handleChange}
            >
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
          className={fieldErrors.birth_date ? 'field-invalid' : undefined}
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
          className={`register-upper ${fieldErrors.fiscal_code ? 'field-invalid' : ''}`}
          value={form.fiscal_code}
          onChange={handleChange}
        />

        <label htmlFor="address">Via di residenza</label>
        <input
          id="address"
          name="address"
          className={fieldErrors.address ? 'field-invalid' : undefined}
          type="text"
          placeholder="Es. Via Roma 12"
          value={form.address}
          onChange={handleChange}
        />

        <label htmlFor="city">Città</label>
        <input
          id="city"
          name="city"
          className={fieldErrors.city ? 'field-invalid' : undefined}
          type="text"
          placeholder="Es. Milano"
          value={form.city}
          onChange={handleChange}
        />

        <label htmlFor="postal_code">CAP</label>
        <input
          id="postal_code"
          name="postal_code"
          className={fieldErrors.postal_code ? 'field-invalid' : undefined}
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
          className={fieldErrors.phone ? 'field-invalid' : undefined}
          type="tel"
          placeholder="Es. +39 333 1234567"
          value={form.phone}
          onChange={handleChange}
        />

        <label htmlFor="citizenship">Cittadinanza</label>
        <select
          id="citizenship"
          name="citizenship"
          className={fieldErrors.citizenship ? 'field-invalid' : undefined}
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
              className={fieldErrors.citizenship ? 'field-invalid' : undefined}
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
          className={fieldErrors.email ? 'field-invalid' : undefined}
          type="email"
          value={form.email}
          onChange={handleChange}
        />

        <label htmlFor="password">Password (almeno 8 caratteri)</label>
        <input
          id="password"
          name="password"
          className={fieldErrors.password ? 'field-invalid' : undefined}
          type="password"
          value={form.password}
          onChange={handleChange}
        />

        <label htmlFor="confirm">Ripeti la password</label>
        <input
          id="confirm"
          name="confirm"
          className={fieldErrors.confirm ? 'field-invalid' : undefined}
          type="password"
          value={form.confirm}
          onChange={handleChange}
        />

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Registrazione in corso...' : 'Registrati'}
        </button>

        <FormErrors
          items={[...Object.values(fieldErrors), ...generalErrors]}
          title="Non posso creare l'account:"
        />

        <p className="register-back">
          Hai già un account? <Link to="/">Torna alla Home</Link>
        </p>
      </form>
    </div>
  )
}

export default Register
