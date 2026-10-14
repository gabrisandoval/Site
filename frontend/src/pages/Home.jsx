import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Home.css'

const SERVICES = [
  {
    id: 1,
    name: 'CAF - 730 e ISEE',
    description: 'Dichiarazione dei redditi, ISEE, IMU e pratiche fiscali.',
  },
  {
    id: 2,
    name: 'Patronato - NASpI e pensioni',
    description: 'Assistenza per pratiche previdenziali e indennità.',
  },
  {
    id: 3,
    name: 'Sportello Lavoro',
    description: 'Orientamento, curriculum e servizi per chi cerca lavoro.',
  },
]

function Home() {
  const { user, isAuthenticated, logout } = useAuth()

  return (
    <div className="home">
      <header className="home-header">
        <h1>CISL App</h1>
      </header>

      <main className="home-main">
        <section className="home-services">
          <h2>I nostri servizi</h2>

          {SERVICES.map((service) => (
            <article key={service.id} className="service-card">
              <h3>{service.name}</h3>
              <p>{service.description}</p>
              {isAuthenticated ? (
                <button>Prenota</button>
              ) : (
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
                {user?.role !== 'customer' && (
                  <Link to="/dashboard" className="account-link">
                    Vai all'area riservata
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