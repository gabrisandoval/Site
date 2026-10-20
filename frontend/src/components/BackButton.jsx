import { Link } from 'react-router-dom'
import './PageTop.css' // the look of the "← Indietro" button
import './BackButton.css'

// "← Indietro" button placed at the bottom of a page
function BackButton({ to = '/' }) {
  return (
    <div className="page-bottom">
      <Link to={to} className="back-button">
        ← Indietro
      </Link>
    </div>
  )
}

export default BackButton
