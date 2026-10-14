import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import LoginForm from '../components/LoginForm'
import './Login.css'

function Login() {
  const { isAuthenticated } = useAuth()

  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  return (
    <div className="login-page">
      <div className="login-box">
        <LoginForm />
        <p className="login-back">
          <Link to="/">← Torna alla Home</Link>
        </p>
      </div>
    </div>
  )
}

export default Login