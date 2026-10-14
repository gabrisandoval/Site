import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function Dashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div>
      <h1>Area riservata</h1>
      <p>
        Ciao {user?.full_name} (ruolo: {user?.role})
      </p>
      <button onClick={handleLogout}>Esci</button>
    </div>
  )
}

export default Dashboard