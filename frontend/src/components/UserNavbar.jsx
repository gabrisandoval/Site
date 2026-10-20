import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import SiteNavbar from './SiteNavbar'
import './StaffNavbar.css' // same look for the logout button
import './UserNavbar.css'

const ROLE_LABELS = {
  admin: 'Admin',
  employee: 'Dipendente',
  // no label for customers: they just see "Benvenuto, Nome"
}

// Navbar of the public pages (Home, booking, profile...).
// Logged in: "Benvenuto, Nome (Ruolo)" and the Esci button on the right.
// Anything passed as children (e.g. a "back" link) goes before them.
function UserNavbar({ children }) {
  const { user, isAuthenticated, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/')
  }

  return (
    <SiteNavbar>
      {children}
      {isAuthenticated && (
        <>
          <div className="user-welcome">
            <span>
              Benvenuto, <strong>{user?.full_name}</strong>
              {ROLE_LABELS[user?.role] && ` (${ROLE_LABELS[user.role]})`}
            </span>
          </div>
          <button type="button" className="staff-logout" onClick={handleLogout}>
            Esci
          </button>
        </>
      )}
    </SiteNavbar>
  )
}

export default UserNavbar
