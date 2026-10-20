import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  getAllServices,
  createService,
  updateService,
  deleteService,
} from '../api'
import AvailabilityPanel from '../components/AvailabilityPanel'
import StaffNavbar from '../components/StaffNavbar'
import PageTop from '../components/PageTop'
import './Dashboard.css'

function ServicesManager() {
  const { token } = useAuth()

  // "/dashboard/servizi?service=3" -> focusId is '3': show only that service.
  // "/dashboard/servizi" -> focusId is null: show all the services.
  const [searchParams] = useSearchParams()
  const focusId = searchParams.get('service')

  const [services, setServices] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  // Id of the service whose availability panel is open (null = none)
  const [openServiceId, setOpenServiceId] = useState(null)

  // Id of the service being edited (null = none) and the values in the edit form
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    duration_minutes: '30',
  })
  const [isUpdating, setIsUpdating] = useState(false)

  const [newName, setNewName] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newDuration, setNewDuration] = useState('30')
  const [isSaving, setIsSaving] = useState(false)

  // Load all services (including deactivated ones) when the page opens
  useEffect(() => {
    let ignore = false

    async function loadServices() {
      try {
        const data = await getAllServices(token)
        if (ignore) return
        setServices(data)

        // Coming from a "Modifica" button: open the edit form of that service right away
        const target = focusId && data.find((s) => String(s.id) === focusId)
        if (target) {
          setEditingId(target.id)
          setEditForm({
            name: target.name,
            description: target.description,
            duration_minutes: String(target.duration_minutes),
          })
        } else {
          setEditingId(null)
        }
      } catch (err) {
        if (!ignore) setError(err.message)
      } finally {
        if (!ignore) setIsLoading(false)
      }
    }

    loadServices()

    return () => {
      ignore = true
    }
  }, [token, focusId])

  // Activate/deactivate: ask the backend, then replace the service in the list
  // with the updated one the server returns
  async function toggleService(service) {
    setError('')
    try {
      const updated = await updateService(token, service.id, {
        is_active: !service.is_active,
      })
      setServices(services.map((s) => (s.id === updated.id ? updated : s)))
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleDelete(service) {
    if (!window.confirm(`Eliminare "${service.name}"?`)) {
      return
    }

    setError('')
    try {
      await deleteService(token, service.id)
      setServices(services.filter((s) => s.id !== service.id))
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleAddService(event) {
    event.preventDefault()

    if (!newName.trim()) {
      setError('Inserisci il nome del servizio.')
      return
    }

    setError('')
    setIsSaving(true)

    try {
      const created = await createService(token, {
        name: newName.trim(),
        description: newDescription.trim(),
        duration_minutes: Number(newDuration),
      })
      setServices([...services, created])
      setNewName('')
      setNewDescription('')
      setNewDuration('30')
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  // Open or close the availability panel of a service
  function toggleAvailability(serviceId) {
    setOpenServiceId(openServiceId === serviceId ? null : serviceId)
  }

  // Start editing: fill the edit form with the current values of the service
  function startEdit(service) {
    setError('')
    setEditingId(service.id)
    setEditForm({
      name: service.name,
      description: service.description,
      duration_minutes: String(service.duration_minutes),
    })
  }

  function cancelEdit() {
    setEditingId(null)
  }

  // One handler for all the edit inputs: the input's "name" attribute
  // tells us which field of editForm to change
  function handleEditChange(event) {
    setEditForm({ ...editForm, [event.target.name]: event.target.value })
  }

  async function handleSaveEdit(event) {
    event.preventDefault()

    if (!editForm.name.trim()) {
      setError('Inserisci il nome del servizio.')
      return
    }

    setError('')
    setIsUpdating(true)

    try {
      const updated = await updateService(token, editingId, {
        name: editForm.name.trim(),
        description: editForm.description.trim(),
        duration_minutes: Number(editForm.duration_minutes),
      })
      setServices(services.map((s) => (s.id === updated.id ? updated : s)))
      setEditingId(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsUpdating(false)
    }
  }

  // In focus mode only the chosen service is listed
  const shownServices = focusId
    ? services.filter((s) => String(s.id) === focusId)
    : services

  return (
    <div className="dashboard">
      <StaffNavbar />

      <main className="dashboard-main">
        <PageTop title={focusId ? 'Servizio selezionato' : 'Servizi'} />

        <section>
          {focusId && (
            <p className="dash-focus">
              <Link to="/dashboard/servizi">← Mostra tutti i servizi</Link>
            </p>
          )}

          {error && <p className="dash-error">{error}</p>}

          {isLoading && <p className="dash-message">Caricamento servizi...</p>}

          {!isLoading && shownServices.length === 0 && (
            <p className="dash-message">
              {focusId
                ? 'Servizio non trovato.'
                : 'Nessun servizio ancora. Aggiungine uno dal form.'}
            </p>
          )}

          {shownServices.map((service) => (
            <article key={service.id} className="dash-service">
              {editingId === service.id ? (
                <form className="dash-edit-form" onSubmit={handleSaveEdit}>
                  <h3>Modifica servizio</h3>

                  <label htmlFor={`edit-name-${service.id}`}>Nome</label>
                  <input
                    id={`edit-name-${service.id}`}
                    name="name"
                    type="text"
                    value={editForm.name}
                    onChange={handleEditChange}
                  />

                  <label htmlFor={`edit-description-${service.id}`}>Descrizione</label>
                  <input
                    id={`edit-description-${service.id}`}
                    name="description"
                    type="text"
                    value={editForm.description}
                    onChange={handleEditChange}
                  />

                  <label htmlFor={`edit-duration-${service.id}`}>Durata (minuti)</label>
                  <input
                    id={`edit-duration-${service.id}`}
                    name="duration_minutes"
                    type="number"
                    min="5"
                    max="480"
                    value={editForm.duration_minutes}
                    onChange={handleEditChange}
                  />
                  <p className="dash-meta">
                    La nuova durata vale per gli orari creati da ora in poi: quelli già
                    creati non cambiano.
                  </p>

                  <div className="dash-edit-actions">
                    <button type="submit" disabled={isUpdating}>
                      {isUpdating ? 'Salvataggio...' : 'Salva'}
                    </button>
                    <button type="button" className="secondary" onClick={cancelEdit}>
                      Annulla
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="dash-service-top">
                    <div>
                      <h3>{service.name}</h3>
                      <p>{service.description}</p>
                      <p className="dash-meta">
                        Durata: {service.duration_minutes} minuti
                      </p>
                      <span className={service.is_active ? 'badge on' : 'badge off'}>
                        {service.is_active ? 'Attivo' : 'Disattivato'}
                      </span>
                    </div>
                    <div className="dash-buttons">
                      <button onClick={() => startEdit(service)}>Modifica</button>
                      <button onClick={() => toggleAvailability(service.id)}>
                        {openServiceId === service.id ? 'Chiudi orari' : 'Disponibilità'}
                      </button>
                      <button onClick={() => toggleService(service)}>
                        {service.is_active ? 'Disattiva' : 'Attiva'}
                      </button>
                      <button className="danger" onClick={() => handleDelete(service)}>
                        Elimina
                      </button>
                    </div>
                  </div>

                  {openServiceId === service.id && (
                    <AvailabilityPanel service={service} token={token} />
                  )}
                </>
              )}
            </article>
          ))}
        </section>

        {!focusId && (
          <section>
            <h2>Nuovo servizio</h2>
            <form className="dash-form" onSubmit={handleAddService}>
              <label htmlFor="new-name">Nome</label>
              <input
                id="new-name"
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />

              <label htmlFor="new-description">Descrizione</label>
              <input
                id="new-description"
                type="text"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
              />

              <label htmlFor="new-duration">Durata (minuti)</label>
              <input
                id="new-duration"
                type="number"
                min="5"
                max="480"
                value={newDuration}
                onChange={(e) => setNewDuration(e.target.value)}
              />

              <button type="submit" disabled={isSaving}>
                {isSaving ? 'Salvataggio...' : 'Aggiungi servizio'}
              </button>
            </form>
          </section>
        )}
      </main>
    </div>
  )
}

export default ServicesManager