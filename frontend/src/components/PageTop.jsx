import { Link } from 'react-router-dom'
import './PageTop.css'

// Title of a page, with a "← Indietro" button.
// backTo: where the button leads (default: the home of the reserved area).
// backTo={null}: no button, only the title.
function PageTop({ title, backTo = '/dashboard' }) {
  return (
    <div className="page-top">
      {backTo !== null && (
        <Link to={backTo} className="back-button">
          ← Indietro
        </Link>
      )}
      <h1>{title}</h1>
    </div>
  )
}

export default PageTop