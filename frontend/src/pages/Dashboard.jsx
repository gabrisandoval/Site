import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import StaffNavbar from '../components/StaffNavbar'
import BackButton from '../components/BackButton'
import './Dashboard.css'

// Home of the reserved area: one card for each thing the staff can manage
function Dashboard() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()

  // Old links like "/dashboard?service=3" (the "Modifica" buttons of the Home)
  // now lead to the services page
  const focusId = searchParams.get('service')
  if (focusId) {
    return <Navigate to={`/dashboard/servizi?service=${focusId}`} replace />
  }

  return (
    <div className="dashboard">
      <StaffNavbar />

      <main className="dashboard-main">
        <h2>Cosa vuoi fare?</h2>

        <div className="dash-cards">
          <Link to="/dashboard/servizi" className="dash-card">
            <span className="dash-card-icon">🛠️</span>
            <div className="dash-card-text">
              <h2>Servizi</h2>
              <p>Crea e modifica i servizi e gestisci le disponibilità e gli orari.</p>
            </div>
          </Link>

          <Link to="/dashboard/prenotazioni" className="dash-card">
            <span className="dash-card-icon">📅</span>
            <div className="dash-card-text">
              <h2>Prenotazioni</h2>
              <p>Guarda chi ha prenotato, filtra per servizio e ordina l&apos;elenco.</p>
            </div>
          </Link>

          {/* Only the admin manages the accounts */}
          {user?.role === 'admin' && (
            <Link to="/admin/utenti" className="dash-card">
              <span className="dash-card-icon">👥</span>
              <div className="dash-card-text">
                <h2>Utenti</h2>
                <p>Vedi tutti gli account, crea dipendenti e gestisci chi ha accesso.</p>
              </div>
            </Link>
          )}
        </div>

        {/* Back to the public site */}
        <BackButton to="/" />
      </main>
    </div>
  )
}

export default Dashboard
