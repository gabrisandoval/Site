import { useNavigate } from 'react-router-dom'
import './ProfileButton.css'

// A real button that opens the profile page
function ProfileButton() {
  const navigate = useNavigate()

  return (
    <button type="button" className="profile-button" onClick={() => navigate('/profilo')}>
      Profilo
    </button>
  )
}

export default ProfileButton
