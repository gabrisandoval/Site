import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Dashboard.css'

const INITIAL_SERVICES = [
  {
    id: 1,
    name: 'CAF - 730 e ISEE',
    description: 'Dichiarazione dei redditi, ISEE, IMU e pratiche fiscali.',
    isActive: true,
  },
  {
    id: 2,
    name: 'Patronato - NASpI e pensioni',
    description: 'Assistenza per pratiche previdenziali e indennità.',
    isActive: true,
  },
  {
    id: 3,
    name: 'Sportello Lavoro',
    description: 'Orientamento, curriculum e servizi per chi cerca lavoro.',
    isActive: false,
  },
]

function Dashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [services, setServices] = useState(INITIAL_SERVICES)
  const [newName, setNewName] = useState('')
  const [newDescription, setNewDescription] = useState('')

  function handleLogout() {
    logout()
    navigate('/')
  }

  function toggleService(id) {
    setServices(
      services.map((service) =>
        service.id === id
          ? { ...service, isActive: !service.isActive }
          : service
      )
    )
  }

  function handleAddService(event) {
    event.preventDefault()

    if (!newName.trim()) {
      return
    }

    const newService = {
      id: Date.now(),
      name: newName.trim(),
      description: newDescription.trim(),
      isActive: true,
    }

    setServices([...services, newService])
    setNewName('')
    setNewDescription('')
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1>Area riservata</h1>
          <p>
            Benvenuto, {user?.full_name} ({user?.role})
          </p>
        </div>
        <div className="dashboard-actions">
          <Link to="/">Vai al sito</Link>
          <button onClick={handleLogout}>Esci</button>
        </div>
      </header>

      <main className="dashboard-main">
        <section>
          <h2>Servizi</h2>

          {services.map((service) => (
            <article key={service.id} className="dash-service">
              <div>
                <h3>{service.name}</h3>
                <p>{service.description}</p>
                <span className={service.isActive ? 'badge on' : 'badge off'}>
                  {service.isActive ? 'Attivo' : 'Disattivato'}
                </span>
              </div>
              <button onClick={() => toggleService(service.id)}>
                {service.isActive ? 'Disattiva' : 'Attiva'}
              </button>
            </article>
          ))}
        </section>

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

            <button type="submit">Aggiungi servizio</button>
          </form>
        </section>
      </main>
    </div>
  )
}

export default Dashboard