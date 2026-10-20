import { Link } from 'react-router-dom'
import './PageTop.css'

// Title of a page of the reserved area, with a button to go back to the area home
function PageTop({ title }) {
  return (
    <div className="page-top">
      <Link to="/dashboard" className="back-button">
        ← Indietro
      </Link>
      <h1>{title}</h1>
    </div>
  )
}

export default PageTop