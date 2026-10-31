import { useEffect, useState } from 'react'
import { resetUserPassword } from '../api'
import './ResetPasswordDialog.css'

// Box where the admin gives an account a new temporary password.
// Step 1: asks for confirmation. Step 2: shows the new password (only once!).
// account = the account (null = box closed)
function ResetPasswordDialog({ account, token, onClose }) {
  const [result, setResult] = useState(null) // { temporary_password, ... } after the reset
  const [error, setError] = useState('')
  const [isWorking, setIsWorking] = useState(false)
  const [copyState, setCopyState] = useState('') // '' | 'ok' | 'failed'

  // Every time the box opens for an account, start again from step 1
  useEffect(() => {
    setResult(null)
    setError('')
    setCopyState('')
  }, [account])

  // Esc closes the box
  useEffect(() => {
    if (!account) return undefined
    function onKey(event) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [account, onClose])

  if (!account) return null

  async function handleReset() {
    setError('')
    setIsWorking(true)
    try {
      setResult(await resetUserPassword(token, account.id))
    } catch (err) {
      setError(err.message)
    } finally {
      setIsWorking(false)
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(result.temporary_password)
      setCopyState('ok')
    } catch {
      // clipboard blocked by the browser: the password is on screen, it can be copied by hand
      setCopyState('failed')
    }
  }

  return (
    <div className="reset-backdrop" onClick={onClose}>
      <div
        className="reset-box"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reset-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="reset-title">Reimposta password</h2>
        <p className="reset-who">
          <strong>{account.full_name}</strong> ({account.username})
        </p>

        {!result ? (
          <>
            <p>
              La password attuale non si può leggere. Verrà creata una <strong>nuova password
              temporanea</strong> e quella vecchia smetterà di funzionare.
            </p>
            {error && <p className="reset-error">{error}</p>}
            <div className="reset-actions">
              <button type="button" className="reset-cancel" onClick={onClose}>
                Annulla
              </button>
              <button
                type="button"
                className="reset-confirm"
                onClick={handleReset}
                disabled={isWorking}
              >
                {isWorking ? 'Attendi...' : 'Genera nuova password'}
              </button>
            </div>
          </>
        ) : (
          <>
            <p>Nuova password temporanea:</p>
            <p className="reset-password" data-testid="temporary-password">
              {result.temporary_password}
            </p>
            <p className="reset-warning">
              Viene mostrata <strong>una volta sola</strong>: copiala e consegnala alla persona,
              che potrà cambiarla da &quot;Profilo&quot;. Chiusa questa finestra non si può più
              rivedere.
            </p>
            {copyState === 'failed' && (
              <p className="reset-error">
                Copia non riuscita: seleziona la password qui sopra (un clic) e copiala a mano.
              </p>
            )}
            <div className="reset-actions">
              <button type="button" className="reset-cancel" onClick={handleCopy}>
                {copyState === 'ok' ? 'Copiata!' : 'Copia'}
              </button>
              <button type="button" className="reset-confirm" onClick={onClose}>
                Chiudi
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default ResetPasswordDialog