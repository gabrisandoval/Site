import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { getProfile, updateProfile } from '../profileApi'
import { contactToForm, validateContact, contactToChanges } from '../utils/contact'
import { sortServerError } from '../utils/serverErrors'
import UserNavbar from '../components/UserNavbar'
import PageTop from '../components/PageTop'
import ContactFields from '../components/ContactFields'
import FormErrors from '../components/FormErrors'
import ChangePasswordForm from '../components/ChangePasswordForm'
import './Profile.css'

const ROLE_LABELS = { admin: 'Admin', employee: 'Dipendente', customer: 'Cliente' }
const GENDER_LABELS = { M: 'Maschio', F: 'Femmina' }

// "1985-12-10" -> "10 dicembre 1985" (built from the parts: new Date("1985-12-10") is UTC)
function formatBirthDate(isoDate) {
  const [year, month, day] = isoDate.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('it-IT', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function Profile() {
  const { token } = useAuth()

  const [account, setAccount] = useState(null)
  const [form, setForm] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [generalErrors, setGeneralErrors] = useState([])
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
          setForm(contactToForm(data))
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
    setGeneralErrors([])

    const isCustomer = account.role === 'customer'
    const problems = validateContact(form, isCustomer)
    if (Object.keys(problems).length > 0) {
      setFieldErrors(problems)
      return
    }
    setFieldErrors({})
    setIsSaving(true)

    try {
      const saved = await updateProfile(token, contactToChanges(form, isCustomer))
      setAccount(saved)
      setForm(contactToForm(saved))
      setMessage('Dati aggiornati.')
    } catch (err) {
      // The server refused: show its sentences and mark the fields they are about
      const { marked, general } = sortServerError(err.message)
      setFieldErrors(marked)
      setGeneralErrors(general)
    } finally {
      setIsSaving(false)
    }
  }

  const errorList = [...Object.values(fieldErrors), ...generalErrors]

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
              </dl>
            </section>

            <section className="profile-card">
              <h2>I miei contatti</h2>
              <form className="profile-form" onSubmit={handleSubmit} noValidate>
                <ContactFields
                  form={form}
                  fieldErrors={fieldErrors}
                  onChange={handleChange}
                  isCustomer={account.role === 'customer'}
                />

                <button type="submit" disabled={isSaving}>
                  {isSaving ? 'Salvataggio...' : 'Salva modifiche'}
                </button>

                {message && <p className="profile-success">{message}</p>}
                <FormErrors items={errorList} title="Non posso salvare:" />
              </form>
            </section>

            <section className="profile-card">
              <h2>Cambia password</h2>
              <ChangePasswordForm token={token} />
            </section>
          </>
        )}
      </main>
    </div>
  )
}

export default Profile