import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { getUsers, createStaff, deleteUser } from '../api'
import { previewUsername } from '../utils/username'
import { FISCAL_CODE_REGEX, todayISO } from '../utils/identity'
import StaffNavbar from '../components/StaffNavbar'
import PageTop from '../components/PageTop'
import ConfirmDialog from '../components/ConfirmDialog'
import EditUserDialog from '../components/EditUserDialog'
import { getProfile } from '../profileApi'
import './AdminUsers.css'

const ROLE_LABELS = {
  admin: 'Admin',
  employee: 'Dipendente',
  customer: 'Cliente',
}

const ROLE_FILTERS = [
  { value: 'all', label: 'Tutti' },
  { value: 'admin', label: 'Admin' },
  { value: 'employee', label: 'Dipendenti' },
  { value: 'customer', label: 'Clienti' },
]

// The server stores dates in UTC but sends them without the final "Z",
// so we add it: otherwise the browser would read them as local time.
function formatDate(isoDateTime) {
  const value = isoDateTime.endsWith('Z') ? isoDateTime : `${isoDateTime}Z`
  return new Date(value).toLocaleDateString('it-IT', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

// "1985-12-10" -> "10 dic 1985". We build the date from its parts because
// new Date("1985-12-10") would be read as UTC and could show the previous day.
function formatBirthDate(isoDate) {
  const [year, month, day] = isoDate.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('it-IT', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

// Same rule as the backend: optional "+", then digits and spaces, 6 to 20 characters
const PHONE_REGEX = /^\+?[0-9 ]{6,20}$/

// Check the whole form at once and return { fieldName: "what is wrong" }.
// An empty object means the form is valid. Same rules as the backend.
function validateForm(form) {
  const problems = {}

  if (form.first_name.trim().length < 2) {
    problems.first_name = 'Nome: inserisci almeno 2 lettere.'
  } else if (form.first_name.trim().length > 50) {
    problems.first_name = 'Nome: troppo lungo (massimo 50 caratteri).'
  } else if (!previewUsername(form.first_name, form.last_name)) {
    problems.first_name = 'Nome: deve contenere delle lettere.'
  }
  if (form.last_name.trim().length < 2) {
    problems.last_name = 'Cognome: inserisci almeno 2 lettere.'
  } else if (form.last_name.trim().length > 50) {
    problems.last_name = 'Cognome: troppo lungo (massimo 50 caratteri).'
  } else if (!previewUsername(form.first_name, form.last_name)) {
    problems.last_name = 'Cognome: deve contenere delle lettere.'
  }
  if (!form.gender) {
    problems.gender = 'Sesso: selezionalo dall\'elenco.'
  }
  if (!form.birth_date) {
    problems.birth_date = 'Data di nascita: mancante.'
  } else if (form.birth_date > todayISO()) {
    problems.birth_date = 'Data di nascita: non può essere nel futuro.'
  }
  const fiscalCode = form.fiscal_code.trim().toUpperCase()
  if (!fiscalCode) {
    problems.fiscal_code = 'Codice fiscale: mancante.'
  } else if (!FISCAL_CODE_REGEX.test(fiscalCode)) {
    problems.fiscal_code = `Codice fiscale: servono 16 caratteri tra lettere e cifre (ne hai scritti ${fiscalCode.length}).`
  }
  if (form.city.trim().length < 2) {
    problems.city = 'Città: mancante.'
  } else if (form.city.trim().length > 80) {
    problems.city = 'Città: troppo lunga (massimo 80 caratteri).'
  }
  if (!form.postal_code.trim()) {
    problems.postal_code = 'CAP: mancante.'
  } else if (!/^[0-9]{5}$/.test(form.postal_code.trim())) {
    problems.postal_code = 'CAP: deve avere 5 cifre.'
  }
  if (form.address.trim().length < 5) {
    problems.address = 'Via di residenza: mancante o troppo corta (almeno 5 caratteri).'
  } else if (form.address.trim().length > 150) {
    problems.address = 'Via di residenza: troppo lunga (massimo 150 caratteri).'
  }
  if (!form.phone.trim()) {
    problems.phone = 'Telefono: mancante.'
  } else if (!PHONE_REGEX.test(form.phone.trim())) {
    problems.phone = 'Telefono: usa solo cifre e spazi (un + iniziale è ammesso), da 6 a 20 caratteri.'
  }
  if (!form.password) {
    problems.password = 'Password: mancante.'
  } else if (form.password.length < 8) {
    problems.password = `Password: troppo corta (${form.password.length} caratteri, ne servono almeno 8).`
  } else if (new TextEncoder().encode(form.password).length > 72) {
    // The server counts bytes, and accented letters or symbols take more than one
    problems.password = 'Password: troppo lunga (massimo 72 caratteri; lettere accentate e simboli ne contano di più).'
  }

  return problems
}

// The server writes its problems as "Label: text." sentences: the label tells which
// field to mark. Other messages (e.g. a duplicate fiscal code) are matched by keywords.
const LABEL_TO_FIELD = {
  Nome: 'first_name',
  Cognome: 'last_name',
  'Codice fiscale': 'fiscal_code',
  'Data di nascita': 'birth_date',
  Sesso: 'gender',
  Password: 'password',
  'Via di residenza': 'address',
  Città: 'city',
  CAP: 'postal_code',
  Telefono: 'phone',
}

function fieldOfServerError(text) {
  const label = text.split(':')[0].trim()
  if (LABEL_TO_FIELD[label]) return LABEL_TO_FIELD[label]

  const lower = text.toLowerCase()
  if (lower.includes('codice fiscale')) return 'fiscal_code'
  if (lower.includes('nascita')) return 'birth_date'
  if (lower.includes('telefono')) return 'phone'
  if (lower.includes('password')) return 'password'
  return null
}

const EMPTY_FORM = {
  first_name: '',
  last_name: '',
  gender: '',
  birth_date: '',
  fiscal_code: '',
  address: '',
  city: '',
  postal_code: '',
  phone: '',
  password: '',
  role: 'employee',
}

function AdminUsers() {
  const { token } = useAuth()

  const [users, setUsers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const [roleFilter, setRoleFilter] = useState('all')
  const [search, setSearch] = useState('')

  // Which section is open: 'list' = manage accounts, 'create' = new employee form
  const [view, setView] = useState('list')

  const [form, setForm] = useState(EMPTY_FORM)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState('')

  // Problems of the create form: { fieldName: text } plus an optional general text
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState('')

  // The account the admin is about to delete (null = no confirmation box open)
  const [accountToDelete, setAccountToDelete] = useState(null)

  // The account the admin is editing (null = no edit box open)
  const [accountToEdit, setAccountToEdit] = useState(null)

  // Id of the admin who is using the page: his own row has no "Elimina" button
  const [myId, setMyId] = useState(null)

  // Load every account when the page opens
  useEffect(() => {
    let ignore = false

    async function loadUsers() {
      try {
        const data = await getUsers(token)
        if (!ignore) setUsers(data)
      } catch (err) {
        if (!ignore) setError(err.message)
      } finally {
        if (!ignore) setIsLoading(false)
      }
    }

    loadUsers()

    // Who am I? (the server refuses to delete the own account, so we hide the button)
    getProfile(token)
      .then((me) => {
        if (!ignore) setMyId(me.id)
      })
      .catch(() => {})

    return () => {
      ignore = true
    }
  }, [token])

  function changeView(nextView) {
    setView(nextView)
    setError('')
    setMessage('')
    setFieldErrors({})
    setFormError('')
  }

  // One handler for all the inputs: the "name" attribute tells which field to change
  function handleChange(event) {
    const { name, value } = event.target
    setForm({ ...form, [name]: value })

    // The admin is fixing this field: remove its red mark right away
    if (fieldErrors[name]) {
      const { [name]: _fixed, ...others } = fieldErrors
      setFieldErrors(others)
    }
  }

  async function handleCreate(event) {
    event.preventDefault()

    const problems = validateForm(form)
    if (Object.keys(problems).length > 0) {
      setFieldErrors(problems)
      setFormError('')
      return
    }

    setError('')
    setMessage('')
    setFieldErrors({})
    setFormError('')
    setIsSaving(true)

    try {
      const created = await createStaff(token, {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        gender: form.gender,
        birth_date: form.birth_date,
        fiscal_code: form.fiscal_code.trim().toUpperCase(),
        address: form.address.trim(),
        city: form.city.trim(),
        postal_code: form.postal_code.trim(),
        phone: form.phone.trim(),
        password: form.password,
        role: form.role,
      })
      setUsers([...users, created])
      setForm(EMPTY_FORM)
      setMessage(
        `Account creato: ${created.full_name} (${ROLE_LABELS[created.role]}). Username: ${created.username}`,
      )
      // Go to the list so the new account is visible right away
      setView('list')
    } catch (err) {
      // Server refused: show its sentence at the bottom and mark the field it is about
      const text = String(err.message || 'Errore durante la creazione dell\'account.')
      // The server may list several problems, one sentence each ("Telefono: ... Password: ...")
      const sentences = text.split(/(?<=\.) /).filter(Boolean)
      const marked = {}
      let general = []
      for (const sentence of sentences) {
        const field = fieldOfServerError(sentence)
        if (field && !marked[field]) marked[field] = sentence
        else general.push(sentence)
      }
      setFieldErrors(marked)
      setFormError(general.join(' '))
    } finally {
      setIsSaving(false)
    }
  }

  // Called when the admin presses "Elimina" inside the confirmation box
  async function handleConfirmDelete() {
    const account = accountToDelete
    setAccountToDelete(null)

    setError('')
    setMessage('')
    try {
      const result = await deleteUser(token, account.id)
      setUsers(users.filter((u) => u.id !== account.id))
      setMessage(
        result.deleted_bookings > 0
          ? `Account di ${account.full_name} eliminato. Cancellate anche ${result.deleted_bookings} prenotazioni.`
          : `Account di ${account.full_name} eliminato.`,
      )
    } catch (err) {
      setError(err.message)
    }
  }

  // Red border for a field with a problem
  function invalid(name) {
    return fieldErrors[name] ? 'au-invalid' : undefined
  }

  // The list shown at the bottom of the form: every local problem, or the server sentence
  const problemList = Object.values(fieldErrors)
  const showFormError = Boolean(formError)

  // The server accepted the changes: show them in the table and close the box
  function handleSaved(updated) {
    setUsers(users.map((u) => (u.id === updated.id ? updated : u)))
    setAccountToEdit(null)
    setError('')
    setMessage(`Dati di ${updated.full_name} aggiornati.`)
  }

  // How many accounts for each role, shown on the filter buttons
  function countOf(role) {
    return role === 'all' ? users.length : users.filter((u) => u.role === role).length
  }

  // 1) filter by role, 2) filter by the search text (name, username or email)
  const searchText = search.trim().toLowerCase()
  const visibleUsers = users
    .filter((u) => roleFilter === 'all' || u.role === roleFilter)
    .filter(
      (u) =>
        !searchText ||
        u.full_name.toLowerCase().includes(searchText) ||
        u.username.toLowerCase().includes(searchText) ||
        (u.email || '').toLowerCase().includes(searchText) ||
        (u.fiscal_code || '').toLowerCase().includes(searchText) ||
        (u.phone || '').includes(searchText) ||
        (u.address || '').toLowerCase().includes(searchText) ||
        (u.city || '').toLowerCase().includes(searchText) ||
        (u.postal_code || '').includes(searchText) ||
        (u.citizenship || '').toLowerCase().includes(searchText),
    )

  return (
    <div className="au-page">
      <StaffNavbar />

      <main className="au-main">
        {/* "Indietro" leads to the reserved area, but only from the list: while the
            "new employee" form is open the only way back is "Torna agli account" */}
        <PageTop title="Utenti" backTo={view === 'create' ? null : '/dashboard'} />

        {/* One button: opens the "new employee" form, and brings back to the list */}
        <div className="au-tabs">
          <button
            type="button"
            className={view === 'create' ? 'au-tab active' : 'au-tab'}
            onClick={() => changeView(view === 'create' ? 'list' : 'create')}
          >
            {view === 'create' ? '← Torna agli account' : 'Crea dipendente'}
          </button>
        </div>

        {error && <p className="au-error">{error}</p>}
        {message && <p className="au-success">{message}</p>}

        {view === 'create' && (
          <section className="au-card">
            <h2>Nuovo dipendente</h2>
            <form className="au-form" onSubmit={handleCreate} noValidate>
              <div>
                <label htmlFor="first_name">Nome</label>
                <input
                  id="first_name"
                  name="first_name"
                  aria-invalid={Boolean(fieldErrors.first_name)}
                  className={invalid('first_name')}
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
                  aria-invalid={Boolean(fieldErrors.last_name)}
                  className={invalid('last_name')}
                  type="text"
                  value={form.last_name}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label htmlFor="gender">Sesso</label>
                <select
                  id="gender"
                  name="gender"
                  className={invalid('gender')}
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
                  aria-invalid={Boolean(fieldErrors.birth_date)}
                  className={invalid('birth_date')}
                  type="date"
                  max={todayISO()}
                  value={form.birth_date}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label htmlFor="fiscal_code">Codice fiscale</label>
                <input
                  id="fiscal_code"
                  name="fiscal_code"
                  aria-invalid={Boolean(fieldErrors.fiscal_code)}
                  type="text"
                  maxLength="16"
                  className={`au-upper ${fieldErrors.fiscal_code ? 'au-invalid' : ''}`}
                  value={form.fiscal_code}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label htmlFor="address">Via di residenza</label>
                <input
                  id="address"
                  name="address"
                  aria-invalid={Boolean(fieldErrors.address)}
                  className={invalid('address')}
                  type="text"
                  value={form.address}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label htmlFor="city">Città</label>
                <input
                  id="city"
                  name="city"
                  type="text"
                  aria-invalid={Boolean(fieldErrors.city)}
                  className={invalid('city')}
                  value={form.city}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label htmlFor="postal_code">CAP</label>
                <input
                  id="postal_code"
                  name="postal_code"
                  type="text"
                  inputMode="numeric"
                  maxLength="5"
                  aria-invalid={Boolean(fieldErrors.postal_code)}
                  className={invalid('postal_code')}
                  value={form.postal_code}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label htmlFor="phone">Telefono</label>
                <input
                  id="phone"
                  name="phone"
                  aria-invalid={Boolean(fieldErrors.phone)}
                  className={invalid('phone')}
                  type="tel"
                  value={form.phone}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label htmlFor="password">Password (almeno 8 caratteri)</label>
                <input
                  id="password"
                  name="password"
                  aria-invalid={Boolean(fieldErrors.password)}
                  className={invalid('password')}
                  type="password"
                  value={form.password}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label htmlFor="role">Ruolo</label>
                <select id="role" name="role" value={form.role} onChange={handleChange}>
                  <option value="employee">Dipendente</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <button type="submit" disabled={isSaving}>
                {isSaving ? 'Creazione...' : 'Crea account'}
              </button>

              {(problemList.length > 0 || showFormError) && (
                <div className="au-form-errors" role="alert">
                  <strong>
                    {problemList.length > 1
                      ? `Non posso creare l'account: ${problemList.length} cose da correggere`
                      : "Non posso creare l'account:"}
                  </strong>
                  <ul>
                    {problemList.map((text) => (
                      <li key={text}>{text}</li>
                    ))}
                    {showFormError && <li>{formError}</li>}
                  </ul>
                </div>
              )}
            </form>
            <p className="au-meta">
              Username:{' '}
              <strong>{previewUsername(form.first_name, form.last_name) || 'nome.cognome'}</strong>{' '}
              (automatico; per due omonimi il secondo riceve un numero, e li distingue il codice
              fiscale).
            </p>
            <p className="au-meta">
              Un dipendente gestisce servizi e orari. Un admin può anche creare ed eliminare gli
              account del personale.
            </p>
          </section>
        )}

        {view === 'list' && (
          <section className="au-card">
            <h2>Tutti gli account</h2>

            <div className="au-toolbar">
              <div className="au-filters">
                {ROLE_FILTERS.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    className={roleFilter === item.value ? 'au-filter active' : 'au-filter'}
                    onClick={() => setRoleFilter(item.value)}
                  >
                    {item.label} ({countOf(item.value)})
                  </button>
                ))}
              </div>
              <div className="au-search-box">
                <svg
                  className="au-search-icon"
                  viewBox="0 0 24 24"
                  width="18"
                  height="18"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <circle cx="11" cy="11" r="7" />
                  <line x1="16.5" y1="16.5" x2="21" y2="21" />
                </svg>
                <input
                  type="text"
                  className="au-search"
                  placeholder="Cerca"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            {isLoading && <p className="au-meta">Caricamento utenti...</p>}

            {!isLoading && visibleUsers.length === 0 && (
              <p className="au-meta">Nessun account con questi filtri.</p>
            )}

            {visibleUsers.length > 0 && (
              <div className="au-table-wrapper">
                <table className="au-table">
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>Username</th>
                      <th>Codice fiscale</th>
                      <th>Nascita</th>
                      <th>Telefono</th>
                      <th>Indirizzo</th>
                      <th>Cittadinanza</th>
                      <th>Ruolo</th>
                      <th>Registrato il</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleUsers.map((account) => (
                      <tr key={account.id}>
                        <td>{account.full_name}</td>
                        <td>{account.username}</td>
                        <td className="au-nowrap">{account.fiscal_code || '-'}</td>
                        <td className="au-nowrap">
                          {account.birth_date
                            ? `${formatBirthDate(account.birth_date)} (${account.gender})`
                            : '-'}
                        </td>
                        <td className="au-nowrap">{account.phone || '-'}</td>
                        <td>
                          {account.address
                            ? `${account.address}${
                                account.postal_code || account.city
                                  ? `, ${[account.postal_code, account.city].filter(Boolean).join(' ')}`
                                  : ''
                              }`
                            : '-'}
                        </td>
                        <td>{account.citizenship || '-'}</td>
                        <td>
                          <span className={`role-badge ${account.role}`}>
                            {ROLE_LABELS[account.role]}
                          </span>
                        </td>
                        <td className="au-nowrap">{formatDate(account.created_at)}</td>
                        <td>
                          <div className="au-row-actions">
                            <button
                              type="button"
                              className="au-edit"
                              onClick={() => setAccountToEdit(account)}
                            >
                              Modifica
                            </button>
                            {account.id === myId ? (
                              <span className="au-you">(tu)</span>
                            ) : (
                              <button
                                type="button"
                                className="au-delete"
                                onClick={() => setAccountToDelete(account)}
                              >
                                Elimina
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </main>

      {/* Box to correct the contact data of an account */}
      <EditUserDialog
        account={accountToEdit}
        token={token}
        onSaved={handleSaved}
        onCancel={() => setAccountToEdit(null)}
      />

      {/* Nothing is deleted until the admin confirms here */}
      <ConfirmDialog
        open={accountToDelete !== null}
        title="Eliminare questo account?"
        confirmLabel="Elimina"
        onConfirm={handleConfirmDelete}
        onCancel={() => setAccountToDelete(null)}
      >
        {accountToDelete && (
          <>
            <p>
              <strong>{accountToDelete.full_name}</strong> ({accountToDelete.username})
            </p>
            {accountToDelete.role === 'customer' && (
              <p>Verranno cancellate anche tutte le sue prenotazioni.</p>
            )}
            <p>Questa azione non si può annullare.</p>
          </>
        )}
      </ConfirmDialog>
    </div>
  )
}

export default AdminUsers