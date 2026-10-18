import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getServices } from '../api'
import './Home.css'

function Home() {
  const { user, isAuthenticated, logout } = useAuth()
  const navigate = useNavigate()

  // Customers book services; employees and admins manage them
  const isCustomer = isAuthenticated && user?.role === 'customer'
  const isStaff = isAuthenticated && user?.role !== 'customer'

  const [services, setServices] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  // Runs once, when the Home page appears on screen (the [] at the end)
  useEffect(() => {
    let ignore = false

    async function loadServices() {
      try {
        const data = await getServices()
        if (!ignore) setServices(data)
      } catch (err) {
        if (!ignore) setError(err.message)
      } finally {
        if (!ignore) setIsLoading(false)
      }
    }

    loadServices()

    // Cleanup function: if the page is closed before the server answers,
    // we ignore the result instead of updating state that no longer exists
    return () => {
      ignore = true
    }
  }, [])

  return (
    <div className="home">
      <header className="home-header">
        <h1>Kasangga - Centro Servizi</h1>
      </header>

      <main className="home-main">
        <section className="home-services">
          <h2>I nostri servizi</h2>

          {isLoading && <p className="home-message">Caricamento servizi...</p>}

          {error && <p className="home-message home-error">{error}</p>}

          {!isLoading && !error && services.length === 0 && (
            <p className="home-message">Nessun servizio disponibile al momento.</p>
          )}

          {services.map((service) => (
            <article key={service.id} className="service-card">
              <h3>{service.name}</h3>
              <p>{service.description}</p>
              <p className="service-hint">Durata: {service.duration_minutes} minuti</p>

              {isCustomer && (
                <button onClick={() => navigate(`/prenota/${service.id}`)}>Prenota</button>
              )}

              {isStaff && (
                <button onClick={() => navigate(`/dashboard?service=${service.id}`)}>
                  Modifica
                </button>
              )}

              {!isAuthenticated && (
                <p className="service-hint">Accedi per prenotare</p>
              )}
            </article>
          ))}
        </section>

        <aside className="home-account">
          <div className="account-box">
            {isAuthenticated ? (
              <>
                <p>Benvenuto, {user?.full_name}</p>
                {isStaff && (
                  <Link to="/dashboard" className="account-link">
                    Vai all'area riservata
                  </Link>
                )}
                {isCustomer && (
                  <Link to="/le-mie-prenotazioni" className="account-link">
                    Le mie prenotazioni
                  </Link>
                )}
                <button onClick={logout}>Esci</button>
              </>
            ) : (
              <>
                <p>Accedi per prenotare i nostri servizi.</p>
                <Link to="/login" className="account-link">
                  Accedi
                </Link>
                <Link to="/registrati" className="account-secondary">
                  Registrati
                </Link>
              </>
            )}
          </div>
        </aside>
      </main>
    </div>
  )
}

export default Home