import { Link } from 'react-router-dom'
import './SiteNavbar.css'

// The one navbar used by every page: same height, same look.
// What goes on the right side depends on the page, so it comes in as "children".
function SiteNavbar({ children }) {
  return (
    <header className="site-navbar">
      {/* The name on the left always takes you to the public site */}
      <Link to="/" className="site-brand">
        Kasangga Centro Servizi
      </Link>

      <div className="site-navbar-right">{children}</div>
    </header>
  )
}

export default SiteNavbar