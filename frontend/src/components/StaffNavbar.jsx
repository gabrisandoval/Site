import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import SiteNavbar from './SiteNavbar'
import './StaffNavbar.css'

const ROLE_LABELS = {
  admin: 'Admin',
  employee: 'Dipendente',
}

// Navbar of the reserved area (admin and employees): the common bar plus
// the welcome message and the logout button on the right
function StaffNavbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/')
  }

  return (
    <SiteNavbar>
      <div className="staff-welcome">
        <strong>Area riservata</strong>
        <span>
          Benvenuto, {user?.full_name} ({ROLE_LABELS[user?.role] || user?.role})
        </span>
      </div>
      <button type="button" className="staff-logout" onClick={handleLogout}>
        Esci
      </button>
    </SiteNavbar>
  )
}

export default StaffNavbar