import { useEffect, useState } from 'react'
import { NOTICE_KEY } from '../sessionGuard'
import './SessionNotice.css'

// Banner shown once after the login expired: "La sessione è scaduta..."
function SessionNotice() {
  const [visible, setVisible] = useState(() => {
    try {
      const flag = sessionStorage.getItem(NOTICE_KEY) === '1'
      if (flag) sessionStorage.removeItem(NOTICE_KEY) // show it only once
      return flag
    } catch {
      return false
    }
  })

  // It disappears by itself after a while
  useEffect(() => {
    if (!visible) return undefined
    const timer = setTimeout(() => setVisible(false), 12000)
    return () => clearTimeout(timer)
  }, [visible])

  if (!visible) return null

  return (
    <div className="session-notice" role="alert">
      <span>La sessione è scaduta: accedi di nuovo per continuare.</span>
      <button type="button" onClick={() => setVisible(false)} aria-label="Chiudi">
        ×
      </button>
    </div>
  )
}

export default SessionNotice
