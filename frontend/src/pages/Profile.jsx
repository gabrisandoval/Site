import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { getProfile, updateProfile } from '../profileApi'
import { CITIZENSHIPS, OTHER_CITIZENSHIP } from '../utils/citizenships'
import UserNavbar from '../components/UserNavbar'
import PageTop from '../components/PageTop'
import './Profile.css'

const ROLE_LABELS = { admin: 'Admin', employee: 'Dipendente', customer: 'Cliente' }
const GENDER_LABELS = { M: 'Maschio', F: 'Femmina' }

// Same rules as the backend
const PHONE_REGEX = /^\+?[0-9 ]{6,20}$/
const POSTAL_CODE_REGEX = /^[0-9]{5}$/
const EMAIL_REGEX = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

// "1985-12-10" -> "10 dicembre 1985" (built from the parts: new Date("1985-12-10") is UTC)
function formatBirthDate(isoDate) {
  const [year, month, day] = isoDate.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('it-IT', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

// From the saved account to the values of the form fields
function toForm(account) {
  const saved = account.citizenship || ''
  const known = CITIZENSHIPS.includes(saved)
  return {
    address: account.address || '',
    city: account.city || '',
    postal_code: account.postal_code || '',
    phone: account.phone || '',
    email: account.email || '',
    citizenship: known ? saved : saved ? OTHER_CITIZENSHIP : '',
    citizenship_other: known ? '' : saved,
  }
}

// Check the whole form and return { fieldName: "what is wrong" }
function validate(form, isCustomer) {
  const problems = {}
  if (form.address.trim().length < 5) problems.address = 'Via di residenza: mancante o troppo corta.'
  if (form.city.trim().length < 2) problems.city = 'Città: mancante.'
  if (!POSTAL_CODE_REGEX.test(form.postal_code.trim())) problems.postal_code = 'CAP: deve avere 5 cifre.'
  if (!PHONE_REGEX.test(form.phone.trim())) {
    problems.phone = 'Telefono: usa solo cifre e spazi (un + iniziale è ammesso).'
  }
  if (form.email.trim() && !EMAIL_REGEX.test(form.email.trim())) {
    problems.email = 'Email: indirizzo non valido (lascia vuoto se non vuoi indicarla).'
  }
  if (isCustomer) {
    if (!form.citizenship) {
      problems.citizenship = 'Cittadinanza: scegli una voce dall\'elenco.'
    } else if (form.citizenship === OTHER_CITIZENSHIP && form.citizenship_other.trim().length < 2) {
      problems.citizenship = 'Cittadinanza: scrivi quale.'
    }
  }
  return problems
}

function Profile() {
  const { token } = useAuth()

  const [account, setAccount] = useState(null)
  const [form, setForm] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [message, setMessage] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  // Load the data of the person when the page opens
  useEffect(() => {
    let ignore = false

    async function load() {
      try {
        const data = await getProfile(token)
        if (!ignore) {
          setAccount(data)
          setForm(toForm(data))
        }
      } catch (err) {
        if (!ignore) setLoadError(err.message)
      }
    }

    load()
    return () => {
      ignore = true
    }
  }, [token])

  function handleChange(event) {
    const { name, value } = event.target
    setForm({ ...form, [name]: value })
    setMessage('')

    // The person is fixing this field: remove its red mark (the "other citizenship"
    // text box belongs to the citizenship field)
    const errorKey = name === 'citizenship_other' ? 'citizenship' : name
    if (fieldErrors[errorKey]) {
      const { [errorKey]: _fixed, ...others } = fieldErrors
      setFieldErrors(others)
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setMessage('')
    setFormError('')

    const isCustomer = account.role === 'customer'
    const problems = validate(form, isCustomer)
    if (Object.keys(problems).length > 0) {
      setFieldErrors(problems)
      return
    }
    setFieldErrors({})
    setIsSaving(true)

    const changes = {
      address: form.address.trim(),
      city: form.city.trim(),
      postal_code: form.postal_code.trim(),
      phone: form.phone.trim(),
      email: form.email.trim() || null,
    }
    if (isCustomer) {
      changes.citizenship =
        form.citizenship === OTHER_CITIZENSHIP ? form.citizenship_other.trim() : form.citizenship
    }

    try {
      const saved = await updateProfile(token, changes)
      setAccount(saved)
      setForm(toForm(saved))
      setMessage('Dati aggiornati.')
    } catch (err) {
      setFormError(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  const problemList = Object.values(fieldErrors)
  const invalid = (name) => (fieldErrors[name] ? 'profile-invalid' : undefined)

  return (
    <div className="profile-page">
      <UserNavbar />

      <main className="profile-main">
        <PageTop title="Il mio profilo" backTo="/" />

        {loadError && <p className="profile-error">{loadError}</p>}
        {!account && !loadError && <p className="profile-meta">Caricamento...</p>}

        {account && form && (
          <>
            <section className="profile-card">
              <h2>Dati anagrafici</h2>
              <p className="profile-meta">
                Questi dati identificano la persona e non si possono modificare da qui. Per
                correggerli rivolgiti a un amministratore.
              </p>
              <dl className="profile-data">
                <dt>Nome e cognome</dt>
                <dd>{account.full_name}</dd>
                <dt>Username</dt>
                <dd>{account.username}</dd>
                <dt>Codice fiscale</dt>
                <dd>{account.fiscal_code || '-'}</dd>
                <dt>Data di nascita</dt>
                <dd>{account.birth_date ? formatBirthDate(account.birth_date) : '-'}</dd>
                <dt>Sesso</dt>
                <dd>{GENDER_LABELS[account.gender] || '-'}</dd>
                <dt>Ruolo</dt>
                <dd>{ROLE_LABELS[account.role] || account.role}</dd>
              </dl>
            </section>

            <section className="profile-card">
              <h2>I miei contatti</h2>
              <form className="profile-form" onSubmit={handleSubmit} noValidate>
                <label htmlFor="address">Via di residenza</label>
                <input
                  id="address"
                  name="address"
                  type="text"
                  className={invalid('address')}
                  value={form.address}
                  onChange={handleChange}
                />

                <label htmlFor="city">Città</label>
                <input
                  id="city"
                  name="city"
                  type="text"
                  className={invalid('city')}
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
                  className={invalid('postal_code')}
                  value={form.postal_code}
                  onChange={handleChange}
                />

                <label htmlFor="phone">Telefono</label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  className={invalid('phone')}
                  value={form.phone}
                  onChange={handleChange}
                />

                <label htmlFor="email">Email (facoltativa)</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  className={invalid('email')}
                  value={form.email}
                  onChange={handleChange}
                />

                {account.role === 'customer' && (
                  <>
                    <label htmlFor="citizenship">Cittadinanza</label>
                    <select
                      id="citizenship"
                      name="citizenship"
                      className={invalid('citizenship')}
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
                          className={invalid('citizenship')}
                          value={form.citizenship_other}
                          onChange={handleChange}
                        />
                      </>
                    )}
                  </>
                )}

                <button type="submit" disabled={isSaving}>
                  {isSaving ? 'Salvataggio...' : 'Salva modifiche'}
                </button>

                {message && <p className="profile-success">{message}</p>}

                {(problemList.length > 0 || formError) && (
                  <div className="profile-errors" role="alert">
                    <strong>Non posso salvare:</strong>
                    <ul>
                      {problemList.map((text) => (
                        <li key={text}>{text}</li>
                      ))}
                      {formError && <li>{formError}</li>}
                    </ul>
                  </div>
                )}
              </form>
            </section>
          </>
        )}
      </main>
    </div>
  )
}

export default Profile
