import { useState } from 'react'
import { changePassword } from '../profileApi'
import FormErrors from './FormErrors'

const EMPTY = { current: '', next: '', confirm: '' }

// Which field a server sentence is about (current password or new password)
function fieldOfError(sentence) {
  return sentence.toLowerCase().includes('attuale') && !sentence.startsWith('La nuova')
    ? 'current'
    : 'next'
}

// "Cambia password": current password, new password twice
function ChangePasswordForm({ token }) {
  const [form, setForm] = useState(EMPTY)
  const [fieldErrors, setFieldErrors] = useState({})
  const [message, setMessage] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  function handleChange(event) {
    const { name, value } = event.target
    setForm({ ...form, [name]: value })
    setMessage('')
    if (fieldErrors[name]) {
      const { [name]: _fixed, ...others } = fieldErrors
      setFieldErrors(others)
    }
  }

  // Check the whole form at once: { field: "what is wrong" }
  function validate() {
    const problems = {}
    if (!form.current) problems.current = 'Password attuale: mancante.'
    if (!form.next) problems.next = 'Nuova password: mancante.'
    else if (form.next.length < 8) {
      problems.next = `Nuova password: troppo corta (${form.next.length} caratteri, ne servono almeno 8).`
    } else if (new TextEncoder().encode(form.next).length > 72) {
      // The server counts bytes: accented letters and symbols take more than one
      problems.next = 'Nuova password: troppo lunga (massimo 72 caratteri; lettere accentate e simboli ne contano di più).'
    } else if (form.next === form.current) {
      problems.next = 'Nuova password: deve essere diversa da quella attuale.'
    }
    if (form.next && form.next !== form.confirm) {
      problems.confirm = 'Le due nuove password non coincidono.'
    }
    return problems
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setMessage('')

    const problems = validate()
    if (Object.keys(problems).length > 0) {
      setFieldErrors(problems)
      return
    }
    setFieldErrors({})
    setIsSaving(true)

    try {
      await changePassword(token, form.current, form.next)
      setForm(EMPTY)
      setMessage('Password aggiornata. Dal prossimo accesso usa quella nuova.')
    } catch (err) {
      setFieldErrors({ [fieldOfError(err.message)]: err.message })
    } finally {
      setIsSaving(false)
    }
  }

  const mark = (name) => (fieldErrors[name] ? 'field-invalid' : undefined)

  return (
    <form className="profile-form" onSubmit={handleSubmit} noValidate>
      <label htmlFor="current">Password attuale</label>
      <input
        id="current"
        name="current"
        type="password"
        autoComplete="current-password"
        className={mark('current')}
        value={form.current}
        onChange={handleChange}
      />

      <label htmlFor="next">Nuova password (almeno 8 caratteri)</label>
      <input
        id="next"
        name="next"
        type="password"
        autoComplete="new-password"
        className={mark('next')}
        value={form.next}
        onChange={handleChange}
      />

      <label htmlFor="confirm">Ripeti la nuova password</label>
      <input
        id="confirm"
        name="confirm"
        type="password"
        autoComplete="new-password"
        className={mark('confirm')}
        value={form.confirm}
        onChange={handleChange}
      />

      <button type="submit" disabled={isSaving}>
        {isSaving ? 'Salvataggio...' : 'Cambia password'}
      </button>

      {message && <p className="profile-success">{message}</p>}
      <FormErrors items={Object.values(fieldErrors)} title="Non posso cambiare la password:" />
    </form>
  )
}

export default ChangePasswordForm
