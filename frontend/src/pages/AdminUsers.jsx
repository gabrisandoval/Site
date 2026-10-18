import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getUsers, createStaff, deleteStaff } from '../api'
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

const EMPTY_FORM = { full_name: '', username: '', password: '', role: 'employee' }

function AdminUsers() {
  const { user, token, logout } = useAuth()
  const navigate = useNavigate()

  const [users, setUsers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const [roleFilter, setRoleFilter] = useState('all')
  const [search, setSearch] = useState('')

  const [form, setForm] = useState(EMPTY_FORM)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState('')

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

    return () => {
      ignore = true
    }
  }, [token])

  function handleLogout() {
    logout()
    navigate('/')
  }

  // One handler for all the inputs: the "name" attribute tells which field to change
  function handleChange(event) {
    setForm({ ...form, [event.target.name]: event.target.value })
  }

  async function handleCreate(event) {
    event.preventDefault()

    if (form.full_name.trim().length < 2) {
      setError('Inserisci nome e cognome.')
      return
    }
    if (!/^[A-Za-z0-9_.-]{3,30}$/.test(form.username)) {
      setError(
        "L'username deve avere da 3 a 30 caratteri: lettere, numeri, punto, trattino o underscore."
      )
      return
    }
    if (form.password.length < 8 || form.password.length > 72) {
      setError('La password deve avere da 8 a 72 caratteri.')
      return
    }

    setError('')
    setMessage('')
    setIsSaving(true)

    try {
      const created = await createStaff(token, {
        full_name: form.full_name.trim(),
        username: form.username,
        password: form.password,
        role: form.role,
      })
      setUsers([...users, created])
      setForm(EMPTY_FORM)
      setMessage(`Account creato: ${created.full_name} (${ROLE_LABELS[created.role]}).`)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete(account) {
    if (!window.confirm(`Eliminare l'account di ${account.full_name}?`)) {
      return
    }

    setError('')
    setMessage('')
    try {
      await deleteStaff(token, account.id)
      setUsers(users.filter((u) => u.id !== account.id))
    } catch (err) {
      setError(err.message)
    }
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
        (u.email || '').toLowerCase().includes(searchText)
    )

  return (
    <div className="au-page">
      <header className="au-header">
        <div>
          <h1>Utenti</h1>
          <p>
            {user?.full_name} ({user?.role})
          </p>
        </div>
        <div className="au-actions">
          <Link to="/dashboard">← Area riservata</Link>
          <Link to="/">Vai al sito</Link>
          <button onClick={handleLogout}>Esci</button>
        </div>
      </header>

      <main className="au-main">
        <section className="au-card">
          <h2>Nuovo dipendente</h2>
          <form className="au-form" onSubmit={handleCreate}>
            <div>
              <label htmlFor="full_name">Nome e cognome</label>
              <input
                id="full_name"
                name="full_name"
                type="text"
                value={form.full_name}
                onChange={handleChange}
              />
            </div>
            <div>
              <label htmlFor="username">Username</label>
              <input
                id="username"
                name="username"
                type="text"
                value={form.username}
                onChange={handleChange}
              />
            </div>
            <div>
              <label htmlFor="password">Password (almeno 8 caratteri)</label>
              <input
                id="password"
                name="password"
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
          </form>
          <p className="au-meta">
            Un dipendente gestisce servizi e orari. Un admin può anche creare ed eliminare
            gli account del personale.
          </p>
        </section>

        {error && <p className="au-error">{error}</p>}
        {message && <p className="au-success">{message}</p>}

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
            <input
              type="search"
              className="au-search"
              placeholder="Cerca nome, username o email"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
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
                    <th>Email</th>
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
                      <td>{account.email}</td>
                      <td>
                        <span className={`role-badge ${account.role}`}>
                          {ROLE_LABELS[account.role]}
                        </span>
                      </td>
                      <td className="au-nowrap">{formatDate(account.created_at)}</td>
                      <td>
                        {account.role !== 'customer' && (
                          <button
                            type="button"
                            className="au-delete"
                            onClick={() => handleDelete(account)}
                          >
                            Elimina
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

export default AdminUsers